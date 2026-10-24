import { Bill, ShareLine } from "@/features/bill/model/types";
import { cents } from "@/shared/lib/money";

export function splitCents(
  total: number,
  ids: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const base = Math.floor(total / ids.length);
  ids.forEach((id, i) => (out[id] = base + (i < total % ids.length ? 1 : 0)));
  return out;
}

export function proportional(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum),
    amounts = raw.map(Math.floor);
  let left = total - amounts.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => ({ i, f: v - amounts[i] }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .slice(0, left)
    .forEach(({ i }) => amounts[i]++);
  return amounts;
}

export function calculate(bill: Bill) {
  const errors: string[] = [];
  const people = bill.friends.map((friend) => ({
    friend,
    lines: [] as ShareLine[],
    base: 0,
    discount: 0,
    service: 0,
    vat: 0,
    total: 0,
  }));
  let subtotal = 0;
  if (!bill.friends.length) errors.push("เพิ่มเพื่อนอย่างน้อย 1 คน");
  if (!bill.items.length) errors.push("เพิ่มรายการอาหารอย่างน้อย 1 รายการ");
  if (new Set(bill.friends.map((p) => p.id)).size !== bill.friends.length)
    errors.push("รหัสเพื่อนซ้ำกัน");
  if (new Set(bill.items.map((p) => p.id)).size !== bill.items.length)
    errors.push("รหัสรายการซ้ำกัน");
  bill.friends.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`กรอกชื่อเพื่อนคนที่ ${i + 1}`);
  });
  bill.items.forEach((item, i) => {
    const unit = cents(item.price);
    const validQuantity =
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 99;
    const selected = bill.friends
      .filter((p) => item.people.includes(p.id))
      .map((p) => p.id);
    if (!item.name.trim()) errors.push(`กรอกชื่อเมนูที่ ${i + 1}`);
    if (unit === null || unit <= 0)
      errors.push(
        `ราคาของเมนูที่ ${i + 1} ต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง`,
      );
    if (!validQuantity) errors.push(`จำนวนเมนูที่ ${i + 1} ต้องเป็น 1–99`);
    if (!selected.length) errors.push(`เลือกคนที่กินเมนูที่ ${i + 1}`);
    if (
      item.people.length !== new Set(item.people).size ||
      item.people.some((id) => !bill.friends.some((p) => p.id === id))
    )
      errors.push(`รายชื่อผู้กินเมนูที่ ${i + 1} ไม่ถูกต้อง`);
    const lineTotal = (unit ?? 0) * (validQuantity ? item.quantity : 0);
    subtotal += lineTotal;
    const split = splitCents(lineTotal, selected);
    people.forEach((p) => {
      if (selected.includes(p.friend.id)) {
        const amount = split[p.friend.id];
        p.base += amount;
        p.lines.push({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          lineTotal,
          headcount: selected.length,
          amount,
        });
      }
    });
  });
  const discountInput = cents(bill.discount),
    serviceInput = cents(bill.serviceRate),
    vatInput = cents(bill.vatRate);
  if (discountInput === null || discountInput > subtotal)
    errors.push("ส่วนลดต้องเป็นจำนวนเงินตั้งแต่ 0 ถึงยอดค่าอาหาร");
  if (serviceInput === null || serviceInput > 10000)
    errors.push("ค่าบริการต้องอยู่ระหว่าง 0–100%");
  if (vatInput === null || vatInput > 10000)
    errors.push("VAT ต้องอยู่ระหว่าง 0–100%");
  const discount = Math.min(discountInput ?? 0, subtotal);
  const service = Math.round(
    ((subtotal - discount) * (serviceInput ?? 0)) / 10000,
  );
  const vat = Math.round(
    ((subtotal - discount + service) * (vatInput ?? 0)) / 10000,
  );
  const total = subtotal - discount + service + vat;
  if (total > 100000000) errors.push("รองรับยอดบิลสูงสุด 1,000,000 บาท");
  const ds = proportional(
    discount,
    people.map((p) => p.base),
  );
  people.forEach((p, i) => (p.discount = ds[i]));
  const ss = proportional(
    service,
    people.map((p) => p.base - p.discount),
  );
  people.forEach((p, i) => (p.service = ss[i]));
  const vs = proportional(
    vat,
    people.map((p) => p.base - p.discount + p.service),
  );
  people.forEach((p, i) => {
    p.vat = vs[i];
    p.total = p.base - p.discount + p.service + p.vat;
  });
  return {
    people,
    subtotal,
    discount,
    service,
    vat,
    total,
    errors,
    ownerAmount: people.find((p) => p.friend.id === bill.ownerId)?.total ?? 0,
    collect: people
      .filter((p) => p.friend.id !== bill.ownerId)
      .reduce((s, p) => s + p.total, 0),
  };
}

export type BillCalculation = ReturnType<typeof calculate>;
