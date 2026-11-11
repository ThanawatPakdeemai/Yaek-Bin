import { z } from "zod";
import { billSchema } from "@/features/bill/model/schemas";
import { calculate } from "@/features/bill/model/calculate";
import { sendingErrors } from "@/features/bill/model/validation";
import { emailParameters } from "@/features/bill-email/lib/email-friend-template";
import { myEmailParameters } from "@/features/bill-email/lib/email-my-template";
import { emailValid } from "@/shared/lib/email";
import { paymentQR } from "@/features/payments/lib/qr";

export const ENV_NAMES = [
  "EMAILJS_PRIVATEKEY",
  "EMAILJS_PUBLIC_KEY",
  "EMAILJS_SERVICE_ID",
  "EMAILJS_FRIEND_BILL_TEMPLATE_ID",
  "BILL_ACCESS_CODE",
] as const;

type Config = Record<
  Exclude<(typeof ENV_NAMES)[number], "EMAILJS_FRIEND_BILL_TEMPLATE_ID">,
  string
> & {
  EMAILJS_FRIEND_BILL_TEMPLATE_ID?: string;
  EMAILJS_MY_BILL_TEMPLATE_ID?: string;
};
type EmailKind = "friend" | "owner";

export function emailConfig() {
  return Object.fromEntries(
    [...ENV_NAMES, "EMAILJS_MY_BILL_TEMPLATE_ID"].map((k) => [k, process.env[k] || ""]),
  ) as Config;
}

export function configReady(config: Config, kind: EmailKind = "friend") {
  return (
    ENV_NAMES.filter((k) => k !== "EMAILJS_FRIEND_BILL_TEMPLATE_ID").every(
      (k) => Boolean(config[k]),
    ) &&
    Boolean(
      kind === "owner"
        ? config.EMAILJS_MY_BILL_TEMPLATE_ID
        : config.EMAILJS_FRIEND_BILL_TEMPLATE_ID,
    ) &&
    config.BILL_ACCESS_CODE.length >= 16
  );
}

const RESULT_TTL_MS = 24 * 60 * 60 * 1000;
const SEND_INTERVAL_MS = 1200;
const SEND_TIMEOUT_MS = 18000;

const sendSchema = z.object({
  bill: billSchema,
  recipientId: z.string().min(1).max(80),
  retryUncertain: z.boolean().optional(),
});

const sendMySchema = sendSchema.omit({ recipientId: true });

export function handleSendMyBill(
  request: Request,
  config = emailConfig(),
  sendFetch: typeof fetch = fetch,
) {
  return handleSend(request, config, sendFetch, "owner");
}

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function digest(s: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

// Best-effort in-instance duplicate guard. The UI also persists accepted/uncertain
// outcomes. A distributed, exactly-once queue would require durable storage.
const results = new Map<
  string,
  { state: "sending" | "accepted" | "uncertain"; expires: number }
>();

let nextAllowed = 0;

export async function handleSend(
  request: Request,
  config = emailConfig(),
  sendFetch: typeof fetch = fetch,
  kind: EmailKind = "friend",
): Promise<Response> {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  if (!configReady(config, kind))
    return json(
      {
        error: "ยังไม่ได้ตั้งค่าระบบอีเมลและรหัสส่งบิลบนเซิร์ฟเวอร์",
        code: "NOT_CONFIGURED",
      },
      503,
    );

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "ไม่อนุญาตต้นทางนี้" }, 403);

  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !supplied ||
    supplied.length > 256 ||
    (await digest(supplied)) !== (await digest(config.BILL_ACCESS_CODE))
  )
    return json({ error: "รหัสส่งบิลไม่ถูกต้อง", code: "UNAUTHORIZED" }, 401);

  if (!request.headers.get("content-type")?.includes("application/json"))
    return json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, 415);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json({ error: "อ่านข้อมูลบิลไม่สำเร็จ" }, 400);
  }
  if (new TextEncoder().encode(text).length > 100000)
    return json({ error: "ข้อมูลบิลมีขนาดใหญ่เกินไป" }, 413);

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return json({ error: "ข้อมูลบิลไม่ถูกต้อง" }, 400);
  }

  const parsed = (kind === "owner" ? sendMySchema : sendSchema).safeParse(input);

  if (!parsed.success) {
    return json({ error: "ข้อมูลบิลไม่ครบหรือไม่ถูกต้อง" }, 400);
  }

  const { bill, retryUncertain } = parsed.data;
  const recipientId = "recipientId" in parsed.data ? parsed.data.recipientId : bill.ownerId;
  const errors = sendingErrors(bill);

  if (errors.length) return json({ error: errors[0] }, 400);
  const person = calculate(bill).people.find(
    (p) => p.friend.id === recipientId,
  );

  if (kind === "owner") {
    if (!person || !emailValid(person.friend.email))
      return json({ error: "กรอกอีเมลที่ถูกต้องของเจ้าของบิล" }, 400);
  } else if (!person || person.friend.id === bill.ownerId || person.total <= 0) {
    return json({ error: "ไม่พบผู้รับที่มียอดเรียกเก็บ" }, 400);
  }
  if (!person) return json({ error: "ไม่พบเจ้าของบิล" }, 400);
  const key = await digest(JSON.stringify({ kind, bill, recipientId }));
  const now = Date.now();

  for (const [k, v] of results) if (v.expires < now) results.delete(k);
  const previous = results.get(key);

  if (previous?.state === "accepted")
    return json({ accepted: true, duplicate: true });

  if (previous && !(previous.state === "uncertain" && retryUncertain))
    return json(
      {
        error:
          "มีคำขอเดิมที่ยังยืนยันผลไม่ได้ ตรวจสอบ EmailJS History ก่อนส่งซ้ำ",
        code: "UNCERTAIN",
      },
      409,
    );

  if (now < nextAllowed)
    return json(
      { error: "กรุณารอ 2 วินาทีก่อนส่งรายการถัดไป", code: "RATE_LIMIT" },
      429,
    );

  // Reserve the send before QR generation yields so concurrent requests cannot
  // send the same bill twice or bypass the provider's rate limit.
  nextAllowed = now + SEND_INTERVAL_MS;
  results.set(key, { state: "sending", expires: now + RESULT_TTL_MS });
  let qr: string;
  try {
    qr = kind === "friend" ? await paymentQR(bill.promptpay, person.total) : "";
  } catch {
    results.delete(key);
    return json({ error: "สร้าง QR ไม่สำเร็จ กรุณาตรวจสอบพร้อมเพย์" }, 400);
  }

  try {
    const response = await sendFetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: config.EMAILJS_SERVICE_ID,
          template_id: kind === "owner"
            ? config.EMAILJS_MY_BILL_TEMPLATE_ID
            : config.EMAILJS_FRIEND_BILL_TEMPLATE_ID,
          user_id: config.EMAILJS_PUBLIC_KEY,
          accessToken: config.EMAILJS_PRIVATEKEY,
          template_params: kind === "owner"
            ? myEmailParameters(bill)
            : emailParameters(bill, person, qr),
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      },
    );
    if (response.ok) {
      results.set(key, {
        state: "accepted",
        expires: Date.now() + RESULT_TTL_MS,
      });
      return json({ accepted: true });
    }
    if (response.status >= 500) {
      results.set(key, {
        state: "uncertain",
        expires: Date.now() + RESULT_TTL_MS,
      });
      return json(
        {
          error:
            "EmailJS ตอบกลับผิดพลาด จึงยืนยันไม่ได้ว่าส่งสำเร็จหรือไม่ ตรวจสอบ History ก่อนส่งซ้ำ",
          code: "UNCERTAIN",
        },
        502,
      );
    }
    results.delete(key);
    const message =
      response.status === 429
        ? "EmailJS จำกัดอัตราการส่งหรือโควตา กรุณาตรวจสอบบัญชีแล้วลองใหม่"
        : "EmailJS ไม่รับคำขอ ตรวจสอบ Service, Template, คีย์, การอนุญาตส่งจากเซิร์ฟเวอร์ และสิทธิ์แนบไฟล์";
    return json({ error: message, code: "REJECTED" }, 502);
  } catch {
    results.set(key, {
      state: "uncertain",
      expires: Date.now() + RESULT_TTL_MS,
    });
    return json(
      {
        error:
          "การเชื่อมต่อขัดข้อง จึงยืนยันผลไม่ได้ ตรวจสอบ EmailJS History ก่อนส่งซ้ำ",
        code: "UNCERTAIN",
      },
      504,
    );
  }
}
