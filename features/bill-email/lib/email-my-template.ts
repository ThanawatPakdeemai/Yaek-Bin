import type { Bill } from "@/features/bill/model/types";
import { calculate } from "@/features/bill/model/calculate";
import { emailValid } from "@/shared/lib/email";
import { money } from "@/shared/lib/money";

// Parameters for the mybill-email.html template configured in EmailJS.
export function myEmailParameters(bill: Bill) {
  const owner = bill.friends.find((friend) => friend.id === bill.ownerId)!;
  const calc = calculate(bill);
  const totals = new Map(calc.people.map((person) => [person.friend.id, person]));
  const sum = (field: "base" | "discount" | "service" | "vat" | "total") =>
    money(calc.people.reduce((total, person) => total + person[field], 0));

  return {
    owner_email: emailValid(owner.email) ? owner.email.trim() : "",
    subject: bill.title,
    bill_title: bill.title,
    bill_date: bill.date,
    owner_name: owner.name,
    note: bill.note,
    friends: bill.friends.map((friend) => ({
      name: friend.name,
      email: friend.email,
      total_amount: money(totals.get(friend.id)?.total || 0) || "ไม่พบข้อมูล",
    })),
    friend_count: bill.friends.length,
    sum_total_amount: money(calc.total),
    all_subtotal: sum("base"),
    all_discount: sum("discount"),
    all_service: sum("service"),
    all_vat: sum("vat"),
    all_total_amount: sum("total"),
  };
}
