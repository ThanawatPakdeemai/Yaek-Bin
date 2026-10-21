import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { promptpayId } from "@/features/payments/lib/promptpay";

export function paymentPayload(target: string, amount: number) {
  const id = promptpayId(target);
  if (!id) throw new Error("หมายเลขพร้อมเพย์ไม่ถูกต้อง");
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000)
    throw new Error("ยอดเงินไม่ถูกต้อง");
  return generatePayload(id, { amount: amount / 100 });
}

export async function paymentQR(target: string, amount: number) {
  return QRCode.toDataURL(paymentPayload(target, amount), {
    width: 360,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#152a28", light: "#ffffff" },
  });
}
