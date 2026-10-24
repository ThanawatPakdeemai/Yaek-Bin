import "@/features/bill-email/styles/bill-email.css";
import { Mail } from "lucide-react";

type Props = { emailReady: boolean | null };

export function EmailStatus({ emailReady }: Props) {
  return (
    <div className="email-feature">
      <span>
        <Mail size={21} />
      </span>
      <div>
        <h3>ส่งบิลให้เพื่อน สะดวกกว่าเดิม</h3>
        <p>
          แต่ละคนได้รายการที่ตัวเองกิน
          <br />
          พร้อมยอดโอนและ QR ในอีเมลเดียว
        </p>
        <span className={`email-status ${emailReady ? "ready" : ""}`}>
          <span />
          {emailReady === null
            ? "กำลังตรวจสอบอีเมล…"
            : emailReady
              ? "พร้อมส่งอีเมล"
              : "รอตั้งค่า EmailJS"}
        </span>
      </div>
    </div>
  );
}
