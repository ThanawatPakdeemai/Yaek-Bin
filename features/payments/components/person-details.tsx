import "../styles/payments.css";
import type { BillCalculation } from "@/features/bill/model/calculate";
import type { Bill, Friend, PersonTotal } from "@/features/bill/model/types";
import { Download, QrCode } from "lucide-react";
import { money } from "@/shared/lib/money";
import { PaymentImage } from "./payment-image";

type Props = {
  bill: Bill;
  calc: BillCalculation;
  person: PersonTotal | undefined;
  owner: Friend | undefined;
  validQR: boolean;
  downloadQR: (person: PersonTotal) => Promise<void>;
};

export function PersonDetails({
  bill,
  calc,
  person,
  owner,
  validQR,
  downloadQR,
}: Props) {
  if (!person) return null;
  return (
    <div className="modal-body">
      <div className="person-amount">
        <span>ส่วนที่ต้องจ่าย</span>
        <strong>฿{money(person.total)}</strong>
        {person.friend.id === bill.ownerId && (
          <small>ส่วนของคุณเอง ไม่ต้องโอนคืน</small>
        )}
      </div>
      <div className="personal-lines">
        {person.lines.map((l) => (
          <div key={l.id}>
            <span>
              {l.name}
              <small>
                {l.quantity} รายการ · รวม ฿{money(l.lineTotal)} · หาร{" "}
                {l.headcount} คน
              </small>
            </span>
            <b>฿{money(l.amount)}</b>
          </div>
        ))}
        {person.lines.length === 0 && <p>ยังไม่ได้เลือกกินเมนูใด</p>}
        <div>
          <span>ส่วนลด</span>
          <b>−฿{money(person.discount)}</b>
        </div>
        <div>
          <span>ค่าบริการ</span>
          <b>฿{money(person.service)}</b>
        </div>
        <div>
          <span>VAT</span>
          <b>฿{money(person.vat)}</b>
        </div>
      </div>
      {person.total > 0 &&
        person.friend.id !== bill.ownerId &&
        (validQR && calc.errors.length === 0 ? (
          <div className="qr-area">
            <div className="promptpay-label">
              PromptPay <span>พร้อมเพย์</span>
            </div>
            <PaymentImage target={bill.promptpay} amount={person.total} />
            <p>
              โอนให้ <b>{owner?.name}</b>
              <br />
              {bill.promptpay}
            </p>
            <button
              className="btn secondary"
              onClick={() => downloadQR(person)}
            >
              <Download size={16} />
              บันทึก QR
            </button>
            <small>
              ตรวจสอบชื่อบัญชีและยอดในแอปธนาคารก่อนยืนยัน
              <br />
              ระบบนี้ไม่ตรวจสอบสถานะการโอน
            </small>
          </div>
        ) : (
          <div className="config-note">
            <QrCode size={22} />
            <p>กรอกพร้อมเพย์และข้อมูลรายการให้ครบ เพื่อสร้าง QR ของคนนี้</p>
          </div>
        ))}
    </div>
  );
}
