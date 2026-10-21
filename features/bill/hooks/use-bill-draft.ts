"use client";

import { useEffect, useRef, useState } from "react";
import { type Bill } from "@/features/bill/model/types";
import { draftSchema } from "@/features/bill/model/schemas";
import { exampleBill } from "@/features/bill/model/draft";

const STORE = "han-kan-draft-v1";

export function useBillDraft() {
  const [bill, setBill] = useState<Bill | null>(null);
  const [saved, setSaved] = useState(true);
  const [sample, setSample] = useState(true);
  const loadDone = useRef(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "null");
      const parsed = draftSchema.safeParse(raw?.bill);
      if (parsed.success) {
        setBill(parsed.data);
        setSample(Boolean(raw.sample));
      } else setBill(exampleBill());
    } catch {
      setBill(exampleBill());
    }
    loadDone.current = true;
  }, []);
  useEffect(() => {
    if (!bill || !loadDone.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({ bill, sample }));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [bill, sample]);
  return { bill, setBill, saved, setSaved, sample, setSample };
}
