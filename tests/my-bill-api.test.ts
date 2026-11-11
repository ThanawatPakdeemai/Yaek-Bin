import test from "node:test";
import assert from "node:assert/strict";
import { handleSendMyBill, configReady } from "@/features/bill-email/server/send-bill";
import { exampleBill } from "@/features/bill/model/draft";
import { calculate } from "@/features/bill/model/calculate";
import { money } from "@/shared/lib/money";

const config = {
  EMAILJS_PRIVATEKEY: "test-private",
  EMAILJS_PUBLIC_KEY: "test-public",
  EMAILJS_SERVICE_ID: "test-service",
  EMAILJS_MY_BILL_TEMPLATE_ID: "test-owner-template",
  BILL_ACCESS_CODE: "test-organizer-passphrase",
};
function bill() {
  const b = exampleBill();
  b.id = crypto.randomUUID();
  b.promptpay = "0812345678";
  b.friends.forEach((friend, i) => (friend.email = `person${i}@example.com`));
  return b;
}
function req(b = bill(), retryUncertain = false, token = config.BILL_ACCESS_CODE) {
  return new Request("https://app.example/api/send-my-bill", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      origin: "https://app.example",
    },
    body: JSON.stringify({ bill: b, retryUncertain }),
  });
}

test("owner summary uses only the owner template and includes every person's server-calculated totals", async (t) => {
  t.mock.method(Date, "now", () => 1000000);
  const b = bill();
  b.friends[0].email = " owner@example.com ";
  b.discount = "10";
  b.serviceRate = "10";
  b.vatRate = "7";
  let calls = 0;
  let sent: any;
  const fake: typeof fetch = async (_url, init) => {
    calls++;
    sent = JSON.parse(init!.body as string);
    return new Response("OK");
  };
  assert.equal(configReady(config, "owner"), true);
  assert.equal(configReady(config), false);
  const result = await handleSendMyBill(req(b), config, fake);
  assert.equal(result.status, 200);
  assert.equal(sent.template_id, config.EMAILJS_MY_BILL_TEMPLATE_ID);
  assert.equal(sent.service_id, config.EMAILJS_SERVICE_ID);
  assert.equal(sent.user_id, config.EMAILJS_PUBLIC_KEY);
  assert.equal(sent.accessToken, config.EMAILJS_PRIVATEKEY);
  const calc = calculate(b);
  assert.deepEqual(sent.template_params, {
    owner_email: "owner@example.com",
    subject: b.title,
    bill_title: b.title,
    bill_date: b.date,
    owner_name: b.friends[0].name,
    note: b.note,
    friends: calc.people.map((p) => ({ name: p.friend.name, email: p.friend.email.trim(), total_amount: money(p.total) })),
    friend_count: b.friends.length,
    sum_total_amount: money(calc.total),
    all_subtotal: money(calc.subtotal),
    all_discount: money(calc.discount),
    all_service: money(calc.service),
    all_vat: money(calc.vat),
    all_total_amount: money(calc.total),
  });
  assert.ok(!(await result.text()).includes(config.EMAILJS_PRIVATEKEY));
  assert.equal((await (await handleSendMyBill(req(b), config, fake)).json()).duplicate, true);
  assert.equal(calls, 1);
});

test("owner endpoint validates configuration, authorization, owner email and bill before sending", async () => {
  let calls = 0;
  const fake: typeof fetch = async () => { calls++; return new Response("OK"); };
  assert.equal((await handleSendMyBill(req(), { ...config, EMAILJS_MY_BILL_TEMPLATE_ID: "" }, fake)).status, 503);
  assert.equal((await handleSendMyBill(req(bill(), false, "wrong"), config, fake)).status, 401);
  const invalid = bill();
  invalid.friends[0].email = "invalid";
  assert.equal((await handleSendMyBill(req(invalid), config, fake)).status, 400);
  const tampered = bill();
  tampered.items[0].people = ["forged"];
  assert.equal((await handleSendMyBill(req(tampered), config, fake)).status, 400);
  assert.equal(calls, 0);
});

test("owner receives a summary even when their own share is zero", async (t) => {
  t.mock.method(Date, "now", () => 2000000);
  const b = bill();
  b.items.forEach((item) => (item.people = ["p2"]));
  let sent: any;
  const fake: typeof fetch = async (_url, init) => {
    sent = JSON.parse(init!.body as string);
    return new Response("OK");
  };
  assert.equal((await handleSendMyBill(req(b), config, fake)).status, 200);
  assert.equal(sent.template_params.friends[0].total_amount, "0.00");
});

test("uncertain owner delivery requires explicit retry and enforces the shared send interval", async (t) => {
  let now = 3000000;
  t.mock.method(Date, "now", () => now);
  const b = bill();
  let calls = 0;
  const fake: typeof fetch = async () => { calls++; return new Response("error", { status: 500 }); };
  assert.equal((await handleSendMyBill(req(b), config, fake)).status, 502);
  assert.equal((await handleSendMyBill(req(b), config, fake)).status, 409);
  assert.equal((await handleSendMyBill(req(bill()), config, fake)).status, 429);
  now += 2000;
  const ok: typeof fetch = async () => { calls++; return new Response("OK"); };
  assert.equal((await handleSendMyBill(req(b, true), config, ok)).status, 200);
  assert.equal(calls, 2);
});
