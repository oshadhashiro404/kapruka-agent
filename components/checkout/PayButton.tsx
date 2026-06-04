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
    <div className="rounded-xl border border-[#22c55e]/30 bg-[#0d1f0d] p-4 mt-3">
      <h4 className="font-semibold text-[#22c55e]">Order ready</h4>
      <p className="font-sinhala text-xs text-[#8a8a8a] mt-0.5">ඇණවුම සූදානම්</p>
      <p className="text-sm text-[#8a8a8a] mt-2">
        Order <span className="font-mono text-[#f0f0f0]">#{orderId}</span>
      </p>
      <p className="text-sm mt-1">
        <span className="text-[#8a8a8a]">Total:</span>{" "}
        <span className="font-semibold text-[#e65100]">
          {formatLKR(displayTotal)}
        </span>
      </p>
      <p
        className={`text-xs mt-2 ${
          urgent ? "text-red-400" : "text-[#8a8a8a]"
        }`}
      >
        Expires in {formatCountdown(seconds)}
      </p>
      <button
        type="button"
        onClick={() => window.open(payUrl, "_blank", "noopener,noreferrer")}
        disabled={seconds <= 0}
        className={`w-full mt-4 py-3.5 rounded-xl text-white font-bold transition-all ${
          urgent
            ? "bg-red-600 animate-pay-pulse"
            : "bg-[#22c55e] hover:opacity-90"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        PAY NOW / දැන් ගෙවන්න
      </button>
      <p className="text-[10px] text-center text-[#8a8a8a] mt-2">
        Opens Kapruka secure checkout
      </p>
    </div>
  );
}
