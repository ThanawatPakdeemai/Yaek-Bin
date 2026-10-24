import "../styles/bill-email.css";
import type { BillEmail } from "../hooks/use-bill-email";
import type { BillCalculation } from "@/features/bill/model/calculate";
import type { Bill, Friend } from "@/features/bill/model/types";
import {
  Info,
  LoaderCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { Field } from "@/shared/ui/field";
import { money } from "@/shared/lib/money";

type Props = Pick<
  BillEmail,
  | "outcomes"
  | "emailReady"
  | "access"
  | "setAccess"
  | "confirmed"
  | "setConfirmed"
  | "sending"
  | "setResult"
  | "sendBills"
> & {
  bill: Bill;
  calc: BillCalculation;
  owner: Friend | undefined;
  onClose: () => void;
  showEmail: (id: string) => Promise<void>;
};

export function ReviewBill({
  bill,
  calc,
  owner,
  outcomes,
  emailReady,
  access,
  setAccess,
  confirmed,
  setConfirmed,
  sending,
  onClose,
  setResult,
  sendBills,
  showEmail,
}: Props) {
  const recipients = calc.people.filter(
    (p) => p.friend.id !== bill.ownerId && p.total > 0,
  );
  const remaining = recipients.filter(
    (p) => !["accepted", "uncertain"].includes(outcomes[p.friend.id]?.state),
  );
  const accepted = recipients.filter(
    (p) => outcomes[p.friend.id]?.state === "accepted",
  ).length;
  return (
    <div className="modal-body">
      <div className="review-overview">
        <div>
          <small>{bill.title}</small>
          <strong>฿{money(calc.collect)}</strong>
          <span>เรียกเก็บจาก {recipients.length} คน</span>
        </div>
        <span className="review-owner">
          <QrCode size={20} />
          โอนให้ {owner?.name}
          <small>{bill.promptpay}</small>
        </span>
      </div>
      <p className="review-description">
        อีเมลแต่ละฉบับมีเฉพาะรายการและยอดของผู้รับคนนั้น พร้อม QR
        พร้อมเพย์ระบุยอดเงิน
      </p>
      <div className="recipients">
        {recipients.map((p) => (
          <div className="recipient" key={p.friend.id}>
            <div className="recipient-main">
              <div>
                <b>{p.friend.name}</b>
                <span>{p.friend.email}</span>
              </div>
              <strong>฿{money(p.total)}</strong>
              <button
                className="text-button"
                disabled={sending}
                onClick={() => showEmail(p.friend.id)}
              >
                ดูอีเมล
              </button>
            </div>
            {outcomes[p.friend.id] && (
              <div className={`send-state ${outcomes[p.friend.id].state}`}>
                {outcomes[p.friend.id].state === "sending" ? (
                  <>
                    <LoaderCircle size={14} className="spin" />
                    กำลังส่ง…
                  </>
                ) : outcomes[p.friend.id].state === "accepted" ? (
                  <>
                    <CheckCircle2 size={14} />
                    EmailJS รับคำขอแล้ว
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    {outcomes[p.friend.id].message ||
                      "ยืนยันผลไม่ได้ ตรวจสอบ EmailJS History ก่อนส่งซ้ำ"}
                  </>
                )}
              </div>
            )}
            {outcomes[p.friend.id]?.state === "uncertain" && (
              <button
                className="text-button retry-uncertain"
                disabled={sending}
                onClick={() =>
                  setResult(p.friend.id, {
                    state: "failed",
                    retryUncertain: true,
                    message:
                      "ยืนยันแล้วว่าไม่พบอีเมลใน History พร้อมลองส่งใหม่",
                  })
                }
              >
                ฉันตรวจ EmailJS History แล้วว่าไม่ส่ง → อนุญาตให้ลองใหม่
              </button>
            )}
          </div>
        ))}
      </div>
      {!emailReady && (
        <div className="config-note">
          <Info size={18} />
          <div>
            <b>ยังไม่ได้ตั้งค่าการส่งอีเมล</b>
            <p>
              ฟังก์ชันหารบิลและ QR ใช้ได้แล้ว ส่วนการส่งต้องตั้งค่า EmailJS
              และรหัสส่งบิลบนเซิร์ฟเวอร์ก่อน
              ดูขั้นตอนในคู่มือที่ให้มาพร้อมซอร์สโค้ด
            </p>
          </div>
        </div>
      )}
      {accepted > 0 && (
        <p className="inline-success">
          <CheckCircle2 size={16} />
          รับคำขอแล้ว {accepted}/{recipients.length} ฉบับ ·
          ระบบจะไม่ส่งซ้ำให้คนที่สำเร็จในบิลฉบับนี้
        </p>
      )}
      {recipients.some((p) => outcomes[p.friend.id]?.state === "uncertain") && (
        <p className="uncertain-note">
          มีรายการที่ยืนยันผลไม่ได้ ระบบหยุดส่งซ้ำอัตโนมัติ กรุณาตรวจสอบ EmailJS
          History ก่อน เพื่อป้องกันเพื่อนได้บิลซ้ำ
        </p>
      )}
      {remaining.length > 0 && (
        <>
          <Field
            label="รหัสส่งบิลของเจ้าของเว็บ"
            hint="ใช้รหัสที่ตั้งไว้บนเซิร์ฟเวอร์ รหัสนี้จะไม่บันทึกลงเบราว์เซอร์"
          >
            <input
              type="password"
              autoComplete="off"
              value={access}
              maxLength={256}
              disabled={sending}
              onChange={(e) => setAccess(e.target.value)}
              placeholder="กรอกรหัสเพื่อยืนยันการส่ง"
            />
          </Field>
          <label className="confirm-check">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={sending}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              ตรวจสอบรายชื่อ อีเมล ยอดเงิน และหมายเลขพร้อมเพย์แล้ว
              และต้องการส่งอีเมลเรียกเก็บจริง
            </span>
          </label>
        </>
      )}
      <div className="modal-actions">
        <button
          className="btn secondary"
          disabled={sending}
          onClick={() => onClose()}
        >
          กลับไปที่บิล
        </button>
        <button
          className="btn primary"
          disabled={
            !confirmed || !emailReady || !access || sending || !remaining.length
          }
          onClick={sendBills}
        >
          {sending ? (
            <>
              <LoaderCircle size={17} className="spin" />
              กำลังส่งบิล
            </>
          ) : !remaining.length ? (
            <>
              <CheckCircle2 size={17} />
              {accepted === recipients.length ? "ส่งครบแล้ว" : "รอตรวจสอบผล"}
            </>
          ) : (
            <>
              <Send size={16} />
              ส่งเรียกเก็บ {remaining.length} คน
            </>
          )}
        </button>
      </div>
      <p className="quiet-note">
        สถานะ “รับคำขอแล้ว” หมายถึง EmailJS รับส่งต่อ
        ไม่ใช่การยืนยันว่าเพื่อนเปิดอ่านหรือโอนเงินแล้ว
      </p>
    </div>
  );
}
