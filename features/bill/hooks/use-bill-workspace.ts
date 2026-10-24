"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bill, Friend, Item, PersonTotal } from "@/features/bill/model/types";
import { calculate } from "@/features/bill/model/calculate";
import { money } from "@/shared/lib/money";
import { emptyBill } from "@/features/bill/model/draft";
import { promptpayId } from "@/features/payments/lib/promptpay";
import { paymentQR } from "@/features/payments/lib/qr";
import {
  emailParameters,
  emailPreview,
} from "@/features/bill-email/lib/email-template";
import { useBillDraft } from "./use-bill-draft";
import { useBillEmail } from "@/features/bill-email/hooks/use-bill-email";

type Modal = "review" | "person" | "email" | "new" | "help" | null;

export function useBillWorkspace() {
  const { bill, setBill, saved, setSaved, sample, setSample } = useBillDraft();
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (s: string) => {
    setNotice(s);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4500);
  };
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  const calc = useMemo(() => (bill ? calculate(bill) : null), [bill]);
  const email = useBillEmail({
    bill,
    calc,
    setIssues,
    onReview: () => setModal("review"),
  });
  const { sending, setOutcomes } = email;
  const update = (part: Partial<Bill>) => {
    if (!bill || sending) return;
    setBill({ ...bill, ...part });
    setSaved(false);
    setIssues([]);
  };
  const editFriend = (id: string, part: Partial<Friend>) =>
    bill &&
    update({
      friends: bill.friends.map((f) => (f.id === id ? { ...f, ...part } : f)),
    });
  const editItem = (id: string, part: Partial<Item>) =>
    bill &&
    update({
      items: bill.items.map((i) => (i.id === id ? { ...i, ...part } : i)),
    });
  const togglePerson = (item: Item, id: string) =>
    editItem(item.id, {
      people: item.people.includes(id)
        ? item.people.filter((p) => p !== id)
        : [...item.people, id],
    });
  const addFriend = () => {
    if (!bill) return;
    if (bill.friends.length >= 30) return toast("รองรับเพื่อนสูงสุด 30 คน");
    const id = crypto.randomUUID();
    update({ friends: [...bill.friends, { id, name: "", email: "" }] });
    setTimeout(() => document.getElementById(`name-${id}`)?.focus(), 30);
  };
  const addItem = () => {
    if (!bill) return;
    if (bill.items.length >= 100) return toast("รองรับอาหารสูงสุด 100 รายการ");
    const id = crypto.randomUUID();
    update({
      items: [
        ...bill.items,
        {
          id,
          name: "",
          price: "",
          quantity: 1,
          people: bill.friends.map((f) => f.id),
        },
      ],
    });
    setTimeout(() => document.getElementById(`item-${id}`)?.focus(), 30);
  };
  const removeFriend = (id: string) => {
    if (!bill) return;
    if (id === bill.ownerId) return toast("เปลี่ยนเจ้าของบิลก่อนลบชื่อนี้");
    update({
      friends: bill.friends.filter((f) => f.id !== id),
      items: bill.items.map((i) => ({
        ...i,
        people: i.people.filter((p) => p !== id),
      })),
    });
    toast("ลบเพื่อนและนำออกจากรายการอาหารแล้ว");
  };
  const openPerson = (id: string) => {
    setSelected(id);
    setModal("person");
  };
  const showEmail = async (id: string) => {
    if (!bill || !calc) return;
    const person = calc.people.find((p) => p.friend.id === id);
    if (!person) return;
    setSelected(id);
    setPreview("");
    setModal("email");
    try {
      const qr = await paymentQR(bill.promptpay, person.total);
      setPreview(emailPreview(emailParameters(bill, person, qr)));
    } catch {
      toast("กรอกพร้อมเพย์ที่ถูกต้องก่อนดูอีเมล");
      setModal("review");
    }
  };
  const downloadQR = async (person: PersonTotal) => {
    if (!bill) return;
    try {
      const data = await paymentQR(bill.promptpay, person.total);
      const a = document.createElement("a");
      a.href = data;
      a.download = `promptpay-${person.friend.id}-${(person.total / 100).toFixed(2)}.png`;
      a.click();
    } catch {
      toast("กรอกพร้อมเพย์ที่ถูกต้องก่อนดาวน์โหลด");
    }
  };
  const copySummary = async () => {
    if (!bill || !calc) return;
    const owner = bill.friends.find((f) => f.id === bill.ownerId);
    const text = `${bill.title || "สรุปค่าอาหาร"}\n${bill.date}\n\n${calc.people.map((p) => `${p.friend.name}: ฿${money(p.total)}${p.friend.id === bill.ownerId ? " (เจ้าของบิล)" : ""}`).join("\n")}\n\nรวม ฿${money(calc.total)}\nโอนให้ ${owner?.name || ""}\nพร้อมเพย์ ${bill.promptpay || "ยังไม่ระบุ"}\n${bill.note}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("คัดลอกสรุปบิลแล้ว");
    } catch {
      toast("คัดลอกไม่สำเร็จ เบราว์เซอร์อาจไม่อนุญาต");
    }
  };
  const fresh = () => {
    setBill(emptyBill());
    setSample(false);
    setModal(null);
    setOutcomes({});
    setIssues([]);
    toast("เริ่มบิลใหม่แล้ว");
  };
  if (!bill || !calc) return null;
  const owner = bill.friends.find((f) => f.id === bill.ownerId);
  const validQR = Boolean(promptpayId(bill.promptpay));
  const person = calc.people.find((p) => p.friend.id === selected);
  return {
    bill,
    calc,
    saved,
    notice,
    issues,
    modal,
    setModal,
    preview,
    sample,
    update,
    editFriend,
    editItem,
    togglePerson,
    addFriend,
    addItem,
    removeFriend,
    openPerson,
    showEmail,
    downloadQR,
    copySummary,
    fresh,
    owner,
    validQR,
    person,
    ...email,
  };
}

export type BillWorkspace = NonNullable<ReturnType<typeof useBillWorkspace>>;
