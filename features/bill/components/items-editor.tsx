import "@/features/bill/styles/items.css";
import {
  Check,
  ChevronDown,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { Field } from "@/shared/ui/field";
import { SectionTitle } from "@/shared/ui/section-title";
import { money, cents } from "@/shared/lib/money";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function ItemsEditor({
  bill,
  calc,
  editItem,
  update,
  togglePerson,
  addItem,
}: Pick<
  BillWorkspace,
  "bill" | "calc" | "editItem" | "update" | "togglePerson" | "addItem"
>) {
  return (
    <section className="card" id="items">
      <SectionTitle
        icon={UtensilsCrossed}
        number="02"
        title="มื้อนี้กินอะไร"
        description="ติ๊กชื่อคนที่กิน เพื่อแบ่งราคาเฉพาะรายการนั้น"
        action={<span className="count-tag">{bill.items.length} เมนู</span>}
      />
      <div className="menu-labels">
        <span>รายการอาหาร</span>
        <span>ราคา / หน่วย</span>
        <span>จำนวน</span>
        <span>รวม</span>
        <span />
      </div>
      <div className="menu-list">
        {bill.items.map((item, i) => (
          <div className="menu-item" key={item.id}>
            <div className="menu-main">
              <div className="menu-name">
                <span className="item-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  id={`item-${item.id}`}
                  aria-label={`ชื่อเมนูที่ ${i + 1}`}
                  value={item.name}
                  maxLength={100}
                  onChange={(e) => editItem(item.id, { name: e.target.value })}
                  placeholder="ชื่อเมนู"
                />
              </div>
              <label className="money-input">
                <span>฿</span>
                <input
                  aria-label={`ราคา ${item.name || i + 1} ต่อหน่วย`}
                  inputMode="decimal"
                  value={item.price}
                  maxLength={10}
                  onChange={(e) => editItem(item.id, { price: e.target.value })}
                  placeholder="0.00"
                />
              </label>
              <input
                className="quantity"
                aria-label={`จำนวน ${item.name || i + 1}`}
                type="number"
                min={1}
                max={99}
                value={item.quantity || ""}
                onChange={(e) =>
                  editItem(item.id, {
                    quantity: Number(e.target.value),
                  })
                }
              />
              <strong className="line-total">
                {money((cents(item.price) ?? 0) * item.quantity)}
              </strong>
              <button
                className="icon-btn delete"
                aria-label={`ลบเมนู ${item.name || i + 1}`}
                onClick={() =>
                  update({
                    items: bill.items.filter((x) => x.id !== item.id),
                  })
                }
              >
                <Trash2 size={15} color="#e5484d" />
              </button>
            </div>
            <div className="eaters">
              <span className="eater-label">ใครกินบ้าง?</span>
              <div className="person-checks">
                {bill.friends.map((f, idx) => (
                  <label
                    key={f.id}
                    className={`person-check ${item.people.includes(f.id) ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.people.includes(f.id)}
                      onChange={() => togglePerson(item, f.id)}
                    />
                    <span className="check-square">
                      {item.people.includes(f.id) && <Check size={10} />}
                    </span>
                    <span>{f.name || `คนที่ ${idx + 1}`}</span>
                  </label>
                ))}
              </div>
              <button
                className="text-button select-all"
                onClick={() =>
                  editItem(item.id, {
                    people:
                      item.people.length === bill.friends.length
                        ? []
                        : bill.friends.map((f) => f.id),
                  })
                }
              >
                {item.people.length === bill.friends.length
                  ? "ล้างการเลือก"
                  : "เลือกทุกคน"}
              </button>
            </div>
            {!item.people.length && (
              <p className="inline-error">
                เลือกอย่างน้อย 1 คนเพื่อหารรายการนี้
              </p>
            )}
          </div>
        ))}
      </div>
      {bill.items.length === 0 && (
        <div className="empty-menu">
          <UtensilsCrossed size={30} />
          <h3>เริ่มจากเมนูแรกของมื้อ</h3>
          <p>เพิ่มราคา แล้วเลือกคนที่กินด้วยกัน</p>
        </div>
      )}
      <button className="add-button" onClick={addItem}>
        <Plus size={16} />
        เพิ่มรายการอาหาร
      </button>
      <div className="subtotal-row">
        <span>ค่าอาหารทั้งหมด</span>
        <strong>฿{money(calc.subtotal)}</strong>
      </div>
      <details className="extras">
        <summary>
          ส่วนลด ค่าบริการ และภาษี <ChevronDown size={16} />
        </summary>
        <div className="extras-grid">
          <Field label="ส่วนลด (บาท)">
            <input
              inputMode="decimal"
              value={bill.discount}
              onChange={(e) => update({ discount: e.target.value })}
              maxLength={10}
            />
          </Field>
          <Field label="Service charge (%)">
            <input
              inputMode="decimal"
              value={bill.serviceRate}
              onChange={(e) => update({ serviceRate: e.target.value })}
              maxLength={5}
            />
          </Field>
          <Field label="VAT (%)">
            <input
              inputMode="decimal"
              value={bill.vatRate}
              onChange={(e) => update({ vatRate: e.target.value })}
              maxLength={5}
            />
          </Field>
        </div>
        <p className="quiet-note">
          หักส่วนลด → คิดค่าบริการ → คิด VAT และแบ่งตามสัดส่วนที่แต่ละคนกิน
        </p>
      </details>
    </section>
  );
}
