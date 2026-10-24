"use client";

import { useEffect, useRef, useState } from "react";
import { type Bill } from "@/features/bill/model/types";
import { calculate } from "@/features/bill/model/calculate";
import { sendingErrors } from "@/features/bill/model/validation";

type Outcome = {
  state: "accepted" | "failed" | "uncertain" | "sending";
  message?: string;
  retryUncertain?: boolean;
};

type Options = {
  bill: Bill | null;
  calc: ReturnType<typeof calculate> | null;
  setIssues: (issues: string[]) => void;
  onReview: () => void;
};

export function useBillEmail({ bill, calc, setIssues, onReview }: Options) {
  const [emailReady, setEmailReady] = useState<boolean | null>(null);
  const [access, setAccess] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [activeFingerprint, setActiveFingerprint] = useState("");
  const sendLock = useRef(false);
  useEffect(() => {
    fetch("/api/email-status")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) =>
        setEmailReady(Boolean((d as { configured?: boolean }).configured)),
      )
      .catch(() => setEmailReady(false));
  }, []);
  const openReview = async () => {
    if (!bill) return;
    const problems = sendingErrors(bill);
    if (problems.length) {
      setIssues(problems);
      setTimeout(
        () =>
          document
            .getElementById("bill-errors")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        30,
      );
      return;
    }
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(bill)),
    );
    const fp = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    setActiveFingerprint(fp);
    try {
      const existing = JSON.parse(
        localStorage.getItem("han-kan-send-" + fp) || "{}",
      );
      const clean: Record<string, Outcome> = {};
      for (const [id, v] of Object.entries(existing)) {
        const value = v as Outcome;
        if (
          value &&
          ["accepted", "failed", "uncertain", "sending"].includes(value.state)
        )
          clean[id] = {
            ...value,
            state: value.state === "sending" ? "uncertain" : value.state,
          };
      }
      setOutcomes(clean);
    } catch {
      setOutcomes({});
    }
    setConfirmed(false);
    onReview();
  };
  const setResult = (id: string, value: Outcome) =>
    setOutcomes((prev) => {
      const next = { ...prev, [id]: value };
      try {
        localStorage.setItem(
          "han-kan-send-" + activeFingerprint,
          JSON.stringify(next),
        );
      } catch {}
      return next;
    });
  const sendBills = async () => {
    if (
      !bill ||
      !calc ||
      !confirmed ||
      !emailReady ||
      !access ||
      sendLock.current
    )
      return;
    sendLock.current = true;
    setSending(true);
    const recipients = calc.people.filter(
      (p) => p.friend.id !== bill.ownerId && p.total > 0,
    );
    for (const p of recipients) {
      if (
        outcomes[p.friend.id]?.state === "accepted" ||
        outcomes[p.friend.id]?.state === "uncertain"
      )
        continue;
      setResult(p.friend.id, { state: "sending" });
      try {
        const r = await fetch("/api/send-bill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({
            bill,
            recipientId: p.friend.id,
            retryUncertain: outcomes[p.friend.id]?.retryUncertain || false,
          }),
          signal: AbortSignal.timeout(25000),
        });
        const result = (await r.json()) as {
          accepted?: boolean;
          code?: string;
          error?: string;
        };
        if (r.ok && result.accepted)
          setResult(p.friend.id, { state: "accepted" });
        else {
          setResult(p.friend.id, {
            state: result.code === "UNCERTAIN" ? "uncertain" : "failed",
            message: result.error || "ส่งไม่สำเร็จ",
          });
          if (r.status === 401 || r.status === 503 || r.status === 429) break;
        }
      } catch {
        setResult(p.friend.id, {
          state: "uncertain",
          message: "ยืนยันผลไม่ได้ ตรวจสอบ EmailJS History ก่อนส่งซ้ำ",
        });
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    setSending(false);
    sendLock.current = false;
    setAccess("");
  };
  return {
    emailReady,
    access,
    setAccess,
    confirmed,
    setConfirmed,
    sending,
    outcomes,
    setOutcomes,
    openReview,
    setResult,
    sendBills,
  };
}

export type BillEmail = ReturnType<typeof useBillEmail>;
