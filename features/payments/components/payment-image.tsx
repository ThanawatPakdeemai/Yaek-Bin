"use client";

import "../styles/payments.css";
import { useEffect, useState } from "react";
import { paymentQR } from "@/features/payments/lib/qr";
import { money } from "@/shared/lib/money";
import { LoaderCircle } from "lucide-react";

export function PaymentImage({
  target,
  amount,
  onReady,
}: {
  target: string;
  amount: number;
  onReady?: (v: string) => void;
}) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setSrc("");
    setError(false);
    paymentQR(target, amount)
      .then((v) => {
        if (alive) {
          setSrc(v);
          onReady?.(v);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [target, amount]);
  return src ? (
    <img
      className="payment-qr"
      src={src}
      alt={`QR พร้อมเพย์สำหรับยอด ${money(amount)} บาท`}
    />
  ) : (
    <div className="qr-placeholder">
      {error ? (
        <span>สร้าง QR ไม่สำเร็จ</span>
      ) : (
        <LoaderCircle className="spin" />
      )}
    </div>
  );
}
