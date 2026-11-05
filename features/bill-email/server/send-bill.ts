import { z } from "zod";
import { billSchema } from "@/features/bill/model/schemas";
import { calculate } from "@/features/bill/model/calculate";
import { sendingErrors } from "@/features/bill/model/validation";
import { emailParameters } from "@/features/bill-email/lib/email-template";
import { paymentQR } from "@/features/payments/lib/qr";
import emailjs, { EmailJSResponseStatus } from "@emailjs/nodejs";
import { money } from "@/shared/lib/money";

export const ENV_NAMES = [
  "EMAILJS_PRIVATEKEY",
  "EMAILJS_PUBLIC_KEY",
  "EMAILJS_SERVICE_ID",
  "EMAILJS_TEMPLATE_ID",
  "BILL_ACCESS_CODE",
] as const;

type Config = Record<(typeof ENV_NAMES)[number], string>;

export function emailConfig() {
  return Object.fromEntries(
    ENV_NAMES.map((k) => [k, process.env[k] || ""]),
  ) as Config;
}

export function configReady(config: Config) {
  return (
    ENV_NAMES.every((k) => Boolean(config[k])) &&
    config.BILL_ACCESS_CODE.length >= 16
  );
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
): Promise<Response> {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  if (!configReady(config))
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
  console.log("test-send-bill-supplied", supplied);
  console.log("test-send-bill-config", config.BILL_ACCESS_CODE);
  if (
    !supplied ||
    supplied.length > 256 ||
    (await digest(supplied)) !== (await digest(config.BILL_ACCESS_CODE))
  )
    return json({ error: "รหัสส่งบิลไม่ถูกต้อง", code: "UNAUTHORIZED" }, 401);

  if (!request.headers.get("content-type")?.includes("application/json"))
    return json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, 415);

  const text = await request.text();
  if (new TextEncoder().encode(text).length > 100000)
    return json({ error: "ข้อมูลบิลมีขนาดใหญ่เกินไป" }, 413);

  //NOTE - Data input validation
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return json({ error: "ข้อมูลบิลไม่ถูกต้อง" }, 400);
  }
  console.log("test-input", input);

  const parsed = z
    .object({
      bill: billSchema,
      recipientId: z.string().max(80),
      retryUncertain: z.boolean().optional(),
    })
    .safeParse(input);

  if (!parsed.success) {
    return json({ error: "ข้อมูลบิลไม่ครบหรือไม่ถูกต้อง" }, 400);
  }

  const { bill, recipientId, retryUncertain } = parsed.data;
  const errors = sendingErrors(bill);

  const ownerBill2 = bill.friends.find((p) => p.id === bill.ownerId);

  const ownerBill = calculate(bill).people.find(
    (p) => p.friend.id === bill.ownerId,
  );
  if (!ownerBill) return json({ error: "ไม่พบเจ้าของบิล" }, 400);
  if (ownerBill.total < 0)
    return json({ error: "เจ้าของบิลมียอดค้างชำระ กรุณาเคลียร์ก่อนส่ง" }, 400);

  console.log("test-ownerBill", ownerBill);
  console.log("test-ownerBill2", ownerBill2);
  console.log("test-bill-1", bill);
  console.log("test-recipientId-2", recipientId);
  console.log("test-retryUncertain-3", retryUncertain);

  if (errors.length) return json({ error: errors[0] }, 400);
  const person = calculate(bill).people.find(
    (p) => p.friend.id === recipientId,
  );

  console.log("test-person", person);

  if (!person || person.friend.id === bill.ownerId || person.total <= 0)
    return json({ error: "ไม่พบผู้รับที่มียอดเรียกเก็บ" }, 400);
  const key = await digest(JSON.stringify({ bill, recipientId }));
  const now = Date.now();

  for (const [k, v] of results) if (v.expires < now) results.delete(k);
  const previous = results.get(key);
  console.log("test-previous", previous);

  if (previous?.state === "accepted")
    return json({ accepted: true, duplicate: true });
  console.log("test-previous", previous);

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

  nextAllowed = now + 1100;
  let qr: string;
  try {
    qr = await paymentQR(bill.promptpay, person.total);
  } catch {
    return json({ error: "สร้าง QR ไม่สำเร็จ กรุณาตรวจสอบพร้อมเพย์" }, 400);
  }
  results.set(key, { state: "sending", expires: now + 86400000 });

  //ANCHOR - Send to EmailJS
  // try {
  //   const response = await sendFetch(
  //     "https://api.emailjs.com/api/v1.0/email/send",
  //     {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         service_id: config.EMAILJS_SERVICE_ID,
  //         template_id: config.EMAILJS_TEMPLATE_ID,
  //         user_id: config.EMAILJS_PUBLIC_KEY,
  //         accessToken: config.EMAILJS_PRIVATEKEY,
  //         template_params: emailParameters(bill, person, qr),
  //       }),
  //       signal: AbortSignal.timeout(18000),
  //     },
  //   );
  //   if (response.ok) {
  //     results.set(key, { state: "accepted", expires: Date.now() + 86400000 });
  //     return json({ accepted: true });
  //   }
  //   if (response.status >= 500) {
  //     results.set(key, { state: "uncertain", expires: Date.now() + 86400000 });
  //     return json(
  //       {
  //         error:
  //           "EmailJS ตอบกลับผิดพลาด จึงยืนยันไม่ได้ว่าส่งสำเร็จหรือไม่ ตรวจสอบ History ก่อนส่งซ้ำ",
  //         code: "UNCERTAIN",
  //       },
  //       502,
  //     );
  //   }
  //   results.delete(key);
  //   const message =
  //     response.status === 429
  //       ? "EmailJS จำกัดอัตราการส่งหรือโควตา กรุณาตรวจสอบบัญชีแล้วลองใหม่"
  //       : "EmailJS ไม่รับคำขอ ตรวจสอบ Service, Template, คีย์, การอนุญาตส่งจากเซิร์ฟเวอร์ และสิทธิ์แนบไฟล์";
  //   return json({ error: message, code: "REJECTED" }, 502);
  // } catch {
  //   results.set(key, { state: "uncertain", expires: Date.now() + 86400000 });
  //   return json(
  //     {
  //       error:
  //         "การเชื่อมต่อขัดข้อง จึงยืนยันผลไม่ได้ ตรวจสอบ EmailJS History ก่อนส่งซ้ำ",
  //       code: "UNCERTAIN",
  //     },
  //     504,
  //   );
  // }

  //ANCHOR - Test EmailJS Node.js SDK
  // try {
  //   await emailjs.send(
  //     config.EMAILJS_SERVICE_ID,
  //     config.EMAILJS_TEMPLATE_ID,
  //     emailParameters(bill, person, qr),
  //     {
  //       publicKey: config.EMAILJS_PUBLIC_KEY,
  //       privateKey: config.EMAILJS_PRIVATEKEY,
  //     },
  //   );
  //   results.set(key, { state: "accepted", expires: Date.now() + 86400000 });
  //   return json({ accepted: true });
  // } catch (error) {
  //   if (error instanceof EmailJSResponseStatus) {
  //     console.log("EMAILJS FAILED...", error);
  //     results.set(key, { state: "uncertain", expires: Date.now() + 86400000 });
  //     return json(
  //       {
  //         error:
  //           "EmailJS ตอบกลับผิดพลาด จึงยืนยันไม่ได้ว่าส่งสำเร็จหรือไม่ ตรวจสอบ History ก่อนส่งซ้ำ",
  //         code: "UNCERTAIN",
  //       },
  //       502,
  //     );
  //   }
  //   console.log("ERROR", error);
  //   results.set(key, { state: "uncertain", expires: Date.now() + 86400000 });
  //   return json(
  //     {
  //       error:
  //         "การเชื่อมต่อขัดข้อง จึงยืนยันผลไม่ได้ ตรวจสอบ EmailJS History ก่อนส่งซ้ำ",
  //       code: "UNCERTAIN",
  //     },
  //     504,
  //   );
  // }

  console.log("test-qr", qr);

  //!SECTION Test 2
  const {
    EMAILJS_PRIVATEKEY,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
  } = process.env;

  if (
    !EMAILJS_PRIVATEKEY ||
    !EMAILJS_PUBLIC_KEY ||
    !EMAILJS_SERVICE_ID ||
    !EMAILJS_TEMPLATE_ID
  ) {
    throw new Error("Missing EmailJS environment variables");
  }

  // try {
  //   const TEMPLATE_PARAMS = {
  //     owner_name: ownerBill.friend.name,
  //     owner_email: ownerBill.friend.email,
  //     subject: bill.title,
  //     email: person.friend.email,
  //     note: bill.note || "",
  //     bill_date: bill.date,
  //     bill_title: bill.title,
  //     to_name: person.friend.name,
  //     qr_code: qr,
  //     items: person.lines.map((item) => ({
  //       name: item.name,
  //       line_total: item.lineTotal,
  //       quantity: item.quantity,
  //       headcount: item.headcount,
  //       share: money(item.amount),
  //     })),
  //     discount: money(person.discount),
  //     subtotal: money(person.base),
  //     service: money(person.service),
  //     vat: money(person.vat),
  //     total_amount: money(person.total),
  //     promptpay_id: bill.promptpay,
  //   };

  //   const response = await emailjs.send(
  //     EMAILJS_SERVICE_ID,
  //     EMAILJS_TEMPLATE_ID,
  //     TEMPLATE_PARAMS,
  //     {
  //       publicKey: EMAILJS_PUBLIC_KEY,
  //       privateKey: EMAILJS_PRIVATEKEY,
  //     },
  //   );
  //   console.log("test-EMAILJS RESPONSE", response);
  //   if (response.status === 200) {
  //     results.set(key, { state: "accepted", expires: Date.now() + 86400000 });
  //     return json({ accepted: true });
  //   }
  // } catch (error) {
  //   console.log("test-EMAILJS error", error);
  // }
}
