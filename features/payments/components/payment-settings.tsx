import type { Bill } from "@/features/bill/model/types";
import "@/features/payments/styles/payments.css";
import { QrCode, ShieldCheck, Wallet } from "lucide-react";
import { Field } from "@/shared/ui/field";
import { SectionTitle } from "@/shared/ui/section-title";

type Props = {
  bill: Bill;
  update: (part: Partial<Bill>) => void;
  validQR: boolean;
};

export function PaymentSettings({ bill, update, validQR }: Props) {
  return (
    <section className="card" id="payment">
      <SectionTitle
        icon={Wallet}
        number="03"
        title="โอนคืนให้ใคร"
        description="ใช้พร้อมเพย์ของคนที่จ่ายบิลนี้"
      />
      <div className="payment-fields">
        <Field label="เจ้าของบิล / ผู้รับเงิน">
          <select
            value={bill.ownerId}
            onChange={(e) => update({ ownerId: e.target.value })}
          >
            {bill.friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name || "ยังไม่ระบุชื่อ"}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="หมายเลขพร้อมเพย์"
          hint="เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก"
        >
          <input
            inputMode="numeric"
            autoComplete="off"
            value={bill.promptpay}
            maxLength={20}
            placeholder="08x-xxx-xxxx"
            onChange={(e) => update({ promptpay: e.target.value })}
            aria-invalid={Boolean(bill.promptpay && !validQR)}
          />
        </Field>
      </div>
      {bill.promptpay &&
        (validQR ? (
          <div className="inline-success">
            <ShieldCheck size={15} />
            รูปแบบหมายเลขถูกต้อง · สร้าง QR ตามยอดของแต่ละคน
          </div>
        ) : (
          <div className="inline-error">ตรวจสอบหมายเลขพร้อมเพย์อีกครั้ง</div>
        ))}
      <div className="payment-note">
        <QrCode size={26} />
        <p>
          แต่ละคนจะได้ QR พร้อมยอดของตัวเอง
          <small>
            หมายเลขต้องลงทะเบียนพร้อมเพย์แล้ว
            และควรตรวจสอบชื่อบัญชีในแอปธนาคารก่อนโอน
          </small>
        </p>
      </div>
      <Field label="ฝากข้อความถึงเพื่อน (ไม่บังคับ)">
        <textarea
          rows={2}
          value={bill.note}
          maxLength={500}
          placeholder="เช่น ขอบคุณนะทุกคน ไว้เจอกันมื้อหน้า :)"
          onChange={(e) => update({ note: e.target.value })}
        />
      </Field>
    </section>
  );
}
