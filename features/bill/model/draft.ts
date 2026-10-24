import { Bill } from "@/features/bill/model/types";

export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function emptyBill(): Bill {
  const owner = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    title: "",
    date: today(),
    note: "",
    ownerId: owner,
    promptpay: "",
    discount: "0",
    serviceRate: "0",
    vatRate: "0",
    friends: [{ id: owner, name: "เรา", email: "" }],
    items: [],
  };
}

export function exampleBill(): Bill {
  return {
    id: "example-bill",
    title: "มื้ออร่อยกับแก๊งเพื่อน",
    date: today(),
    note: "ขอบคุณสำหรับมื้อนี้นะ ไว้ไปกินด้วยกันอีก :)",
    ownerId: "p1",
    promptpay: "",
    discount: "0",
    serviceRate: "0",
    vatRate: "0",
    friends: [
      { id: "p1", name: "เรา", email: "" },
      { id: "p2", name: "เมย์", email: "" },
      { id: "p3", name: "บอส", email: "" },
      { id: "p4", name: "นัท", email: "" },
    ],
    items: [
      {
        id: "i1",
        name: "ข้าวผัดปู",
        quantity: 1,
        price: "180",
        people: ["p1", "p2", "p3", "p4"],
      },
      {
        id: "i2",
        name: "ต้มยำกุ้ง",
        quantity: 1,
        price: "240",
        people: ["p1", "p2", "p3"],
      },
      {
        id: "i3",
        name: "ไก่ทอด",
        quantity: 1,
        price: "160",
        people: ["p3", "p4"],
      },
      {
        id: "i4",
        name: "น้ำเปล่า",
        quantity: 2,
        price: "20",
        people: ["p1", "p2", "p3", "p4"],
      },
    ],
  };
}
