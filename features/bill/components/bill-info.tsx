import "@/features/bill/styles/bill-info.css";
import { ReceiptText } from "lucide-react";
import { Field } from "@/shared/ui/field";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function BillInfo({
  bill,
  update,
}: Pick<BillWorkspace, "bill" | "update">) {
  return (
    <section className="card bill-info">
      <div className="card-mini-title">
        <ReceiptText size={17} />
        <h2>บิลของเรา</h2>
        <span className="draft-tag">ฉบับร่าง</span>
      </div>
      <div className="bill-fields">
        <Field label="ชื่อบิล / ร้านอาหาร">
          <input
            aria-label="ชื่อบิลหรือร้านอาหาร"
            value={bill.title}
            maxLength={100}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="เช่น มื้อเย็นวันศุกร์ · ร้านอร่อย"
          />
        </Field>
        <Field label="วันที่">
          <input
            type="date"
            value={bill.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </Field>
      </div>
    </section>
  );
}
