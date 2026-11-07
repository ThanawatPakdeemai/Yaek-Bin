import test from "node:test";
import assert from "node:assert/strict";
import { handleSend } from "@/features/bill-email/server/send-bill";
import { exampleBill } from "@/features/bill/model/draft";
const config = {
  EMAILJS_PRIVATEKEY: "test-private",
  EMAILJS_PUBLIC_KEY: "test-public",
  EMAILJS_SERVICE_ID: "test-service",
  EMAILJS_TEMPLATE_ID: "test-template",
  BILL_ACCESS_CODE: "test-organizer-passphrase",
};
function bill() {
  const b = exampleBill();
  b.id = crypto.randomUUID();
  b.promptpay = "0812345678";
  b.friends.forEach((p, i) => (p.email = `person${i}@example.com`));
  return b;
}
function req(b = bill(), token = config.BILL_ACCESS_CODE) {
  return new Request("https://app.example/api/send-bill", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      origin: "https://app.example",
    },
    body: JSON.stringify({ bill: b, recipientId: "p2" }),
  });
}
test("email endpoint rejects missing configuration and unauthorized calls without sending", async () => {
  let called = false;
  const fake = async () => {
    called = true;
    return new Response("OK");
  };
  assert.equal(
    (
      await handleSend(
        req(),
        { ...config, EMAILJS_PRIVATEKEY: "" },
        fake as typeof fetch,
      )
    ).status,
    503,
  );
  assert.equal(
    (await handleSend(req(bill(), "wrong"), config, fake as typeof fetch))
      .status,
    401,
  );
  assert.equal(called, false);
});
test("server recomputes recipient amount, attaches generated QR, keeps private key server-side and suppresses duplicate success", async () => {
  const b = bill();
  let count = 0;
  let sent: any;
  const fake = async (_url: any, init: any) => {
    count++;
    sent = JSON.parse(init.body);
    return new Response("OK");
  };
  const r = await handleSend(req(b), config, fake as typeof fetch);
  assert.equal(r.status, 200);
  assert.equal(sent.template_params.total_amount, "135.00");
  assert.equal(sent.template_params.to_email, "person1@example.com");
  assert.ok(sent.template_params.qr_image.startsWith("data:image/png;base64,"));
  assert.equal(sent.accessToken, "test-private");
  assert.equal(sent.service_id, config.EMAILJS_SERVICE_ID);
  assert.equal(sent.template_id, config.EMAILJS_TEMPLATE_ID);
  assert.equal(sent.user_id, config.EMAILJS_PUBLIC_KEY);
  assert.equal(sent.template_params.email, sent.template_params.to_email);
  assert.equal(sent.template_params.qr_code, sent.template_params.qr_image);
  assert.equal(sent.template_params.subject, b.title);
  assert.ok(!(await r.text()).includes("test-private"));
  const second = await handleSend(req(b), config, fake as typeof fetch);
  assert.equal(
    ((await second.json()) as { duplicate?: boolean }).duplicate,
    true,
  );
  assert.equal(count, 1);
});
test("server refuses tampered references and owners as recipients", async () => {
  const b = bill();
  b.items[0].people = ["forged"];
  assert.equal((await handleSend(req(b), config)).status, 400);
  const b2 = bill();
  const r = new Request("https://app.example/api/send-bill", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.BILL_ACCESS_CODE}`,
    },
    body: JSON.stringify({ bill: b2, recipientId: b2.ownerId }),
  });
  assert.equal((await handleSend(r, config)).status, 400);
});
test("uncertain delivery is blocked until organizer explicitly verifies provider history", async (t) => {
  const realNow = Date.now();
  t.mock.method(Date, "now", () => realNow + 5000);
  const b = bill();
  const timeout = async () => {
    throw new Error("network disconnected");
  };
  const first = await handleSend(req(b), config, timeout as typeof fetch);
  assert.equal(first.status, 504);
  assert.equal(((await first.json()) as { code: string }).code, "UNCERTAIN");
  const blocked = await handleSend(req(b), config, timeout as typeof fetch);
  assert.equal(blocked.status, 409);
  t.mock.method(Date, "now", () => realNow + 8000);
  let calls = 0;
  const fake = async () => {
    calls++;
    return new Response("OK");
  };
  const retry = new Request("https://app.example/api/send-bill", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.BILL_ACCESS_CODE}`,
    },
    body: JSON.stringify({ bill: b, recipientId: "p2", retryUncertain: true }),
  });
  assert.equal(
    (await handleSend(retry, config, fake as typeof fetch)).status,
    200,
  );
  assert.equal(calls, 1);
});

test("provider rejection allows retry while provider server errors block duplicate sends", async (t) => {
  let now = Date.now() + 20000;
  t.mock.method(Date, "now", () => now);

  for (const status of [400, 429, 500]) {
    now += 5000;
    const b = bill();
    let calls = 0;
    const fake = async () => {
      calls++;
      return new Response("Provider error", { status });
    };
    const first = await handleSend(req(b), config, fake as typeof fetch);
    assert.equal(first.status, 502);
    assert.equal(
      (await first.json()).code,
      status >= 500 ? "UNCERTAIN" : "REJECTED",
    );

    now += 5000;
    const retry = await handleSend(req(b), config, fake as typeof fetch);
    assert.equal(retry.status, status >= 500 ? 409 : 502);
    assert.equal(calls, status >= 500 ? 1 : 2);
  }
});

test("simultaneous duplicate requests send once and distinct bills are rate limited", async (t) => {
  const now = Date.now() + 100000;
  t.mock.method(Date, "now", () => now);
  const b = bill();
  let calls = 0;
  const fake = async () => {
    calls++;
    return new Response("OK");
  };
  const responses = await Promise.all([
    handleSend(req(b), config, fake as typeof fetch),
    handleSend(req(b), config, fake as typeof fetch),
  ]);
  assert.equal(calls, 1);
  assert.ok(responses.some((r) => r.status === 200));
  assert.ok(responses.every((r) => r.status === 200 || r.status === 409));

  const limited = await handleSend(req(), config, fake as typeof fetch);
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, "RATE_LIMIT");
  assert.equal(calls, 1);
});

test("malformed JSON and empty recipients are rejected before contacting EmailJS", async () => {
  let calls = 0;
  const fake = async () => {
    calls++;
    return new Response("OK");
  };
  for (const body of ["{", JSON.stringify({ bill: bill(), recipientId: "" })]) {
    const request = new Request("https://app.example/api/send-bill", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.BILL_ACCESS_CODE}`,
      },
      body,
    });
    assert.equal((await handleSend(request, config, fake as typeof fetch)).status, 400);
  }
  assert.equal(calls, 0);
});
