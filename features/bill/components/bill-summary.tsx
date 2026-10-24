import "@/features/bill/styles/summary.css";
import { ChevronDown, Copy, Info, ReceiptText } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { money } from "@/shared/lib/money";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function BillSummary({
  bill,
  calc,
  owner,
  openPerson,
  copySummary,
}: Pick<
  BillWorkspace,
  "bill" | "calc" | "owner" | "openPerson" | "copySummary"
>) {
  return (
    <section className="card summary-card">
      <div className="summary-title">
        <ReceiptText size={18} />
        <h2>สรุปบิลมื้อนี้</h2>
        <span>THB</span>
      </div>
      <div className="grand-total">
        <span>ยอดรวมสุทธิ</span>
        <strong>
          <small>฿</small>
          {money(calc.total)}
        </strong>
        <p>
          {bill.friends.length} คนร่วมโต๊ะ <i /> {bill.items.length} รายการอาหาร
        </p>
      </div>
      <div className="summary-breakdown">
        <div>
          <span>ค่าอาหาร</span>
          <b>{money(calc.subtotal)}</b>
        </div>
        {calc.discount > 0 && (
          <div>
            <span>ส่วนลด</span>
            <b>−{money(calc.discount)}</b>
          </div>
        )}
        {calc.service > 0 && (
          <div>
            <span>ค่าบริการ {bill.serviceRate}%</span>
            <b>{money(calc.service)}</b>
          </div>
        )}
        {calc.vat > 0 && (
          <div>
            <span>VAT {bill.vatRate}%</span>
            <b>{money(calc.vat)}</b>
          </div>
        )}
      </div>
      <div className="dashed-separator" />
      <h3 className="person-totals-title">แต่ละคนจ่ายเท่าไหร่</h3>
      <div className="person-totals">
        {calc.people.map((p, i) => (
          <button
            className="person-total"
            key={p.friend.id}
            onClick={() => openPerson(p.friend.id)}
          >
            <Avatar name={p.friend.name} index={i} small />
            <span className="person-total-name">
              {p.friend.name || "ยังไม่ระบุชื่อ"}
              <small>
                {p.friend.id === bill.ownerId
                  ? "ส่วนของเจ้าของบิล"
                  : `${p.lines.length} เมนูที่กินด้วยกัน`}
              </small>
            </span>
            <strong>฿{money(p.total)}</strong>
            <ChevronDown size={14} />
          </button>
        ))}
      </div>
      <div className="collect-total">
        <div>
          <span>ยอดที่เพื่อนโอนคืน</span>
          <small>ไม่รวมส่วนของ {owner?.name || "เจ้าของบิล"}</small>
        </div>
        <strong>฿{money(calc.collect)}</strong>
      </div>
      <button className="btn secondary copy-button" onClick={copySummary}>
        <Copy size={15} />
        คัดลอกสรุปบิล
      </button>
      <p className="rounding-note">
        <Info size={15} />
        หารเป็นสตางค์ ยอดแต่ละคนรวมตรงกับบิล ส่วนต่างจากการปัดเศษอาจต่างกัน 0.01
        บาท
      </p>
    </section>
  );
}
