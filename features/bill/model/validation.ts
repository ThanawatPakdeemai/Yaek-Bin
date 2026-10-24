import { Bill } from "@/features/bill/model/types";
import { calculate } from "@/features/bill/model/calculate";
import { billSchema } from "@/features/bill/model/schemas";
import { promptpayId } from "@/features/payments/lib/promptpay";
import { emailValid } from "@/shared/lib/email";

export function sendingErrors(bill: Bill): string[] {
  const calc = calculate(bill);
  const errors = [...calc.errors];
  if (!bill.title.trim()) errors.push("กรอกชื่อบิล");
  if (!billSchema.safeParse(bill).success)
    errors.push("ตรวจสอบข้อมูลบิล: ชื่อ วันที่ หรือจำนวนรายการไม่ถูกต้อง");
  if (!promptpayId(bill.promptpay))
    errors.push(
      "กรอกพร้อมเพย์เป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลักที่ถูกต้อง",
    );
  if (!bill.friends.some((f) => f.id === bill.ownerId))
    errors.push("เลือกเจ้าของบิล");
  const recipients = calc.people.filter(
    (p) => p.friend.id !== bill.ownerId && p.total > 0,
  );
  if (!recipients.length) errors.push("ยังไม่มีเพื่อนที่มียอดเรียกเก็บ");
  recipients.forEach((p) => {
    if (!emailValid(p.friend.email))
      errors.push(`กรอกอีเมลที่ถูกต้องของ ${p.friend.name || "เพื่อน"}`);
  });
  return [...new Set(errors)];
}
