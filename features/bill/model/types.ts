export type Friend = { id: string; name: string; email: string };

export type Item = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  people: string[];
};

export type Bill = {
  id: string;
  title: string;
  date: string;
  note: string;
  ownerId: string;
  promptpay: string;
  discount: string;
  serviceRate: string;
  vatRate: string;
  friends: Friend[];
  items: Item[];
};

export type ShareLine = {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
  headcount: number;
  amount: number;
};

export type PersonTotal = {
  friend: Friend;
  lines: ShareLine[];
  base: number;
  discount: number;
  service: number;
  vat: number;
  total: number;
};
