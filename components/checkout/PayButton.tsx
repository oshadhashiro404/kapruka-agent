"use client";

import { useEffect, useState } from "react";
import { formatCountdown, formatLKR } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";

interface PayButtonProps {
  payUrl: string;
  orderId: string;
  expiresIn: number;
  totalLkr?: number;
}

export default function PayButton({
  payUrl,
  orderId,
  expiresIn,
  totalLkr,
}: PayButtonProps) {
  const [seconds, setSeconds] = useState(expiresIn);
  const deliveryCost = useCartStore((s) => s.deliveryCostLkr);
  const cartTotal = useCartStore((s) => s.totalLkr());
  const displayTotal = totalLkr ?? cartTotal + deliveryCost;
  const urgent = seconds < 300;

  useEffect(() => {
    setSeconds(expiresIn);
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [expiresIn]);

  return (
    <div className="rounded-xl border border-success/30 bg-[var(--pay-bg)] p-4 mt-3">
      <h4 className="font-semibold text-success">Order ready</h4>
      <p className="font-sinhala text-xs text-muted mt-0.5">ඇණවුම සූදානම්</p>
      <p className="text-sm text-muted mt-2">
        Order <span className="font-mono text-foreground">#{orderId}</span>
      </p>
      <p className="text-sm mt-1">
        <span className="text-muted">Total:</span>{" "}
        <span className="font-semibold text-primary">
          {formatLKR(displayTotal)}
        </span>
      </p>
      <p
        className={`text-xs mt-2 ${urgent ? "text-danger" : "text-muted"}`}
      >
        Expires in {formatCountdown(seconds)}
      </p>
      <button
        type="button"
        onClick={() => window.open(payUrl, "_blank", "noopener,noreferrer")}
        disabled={seconds <= 0}
        className={`w-full mt-4 py-3.5 rounded-xl text-white font-bold transition-all focus:outline-none focus:ring-2 focus:ring-success/50 ${
          urgent
            ? "bg-danger animate-pay-pulse"
            : "bg-success hover:opacity-90"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        PAY NOW / දැන් ගෙවන්න
      </button>
      <p className="text-[10px] text-center text-muted mt-2">
        Opens Kapruka secure checkout
      </p>
    </div>
  );
}
