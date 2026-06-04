"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/lib/cart-store";

interface HeaderProps {
  onCartClick: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const itemCount = useCartStore((s) => s.itemCount());
  const prevCount = useRef(itemCount);
  const [badgePulse, setBadgePulse] = useState(false);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 600);
      prevCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#2e2e2e]">
      <div>
        <h1 className="text-lg font-bold text-[#e65100] leading-tight tracking-tight">
          Kapruka
        </h1>
        <p className="font-sinhala text-[10px] text-[#8a8a8a]">කප්රුකා</p>
      </div>
      <button
        type="button"
        onClick={onCartClick}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-full bg-[#242424] border border-[#2e2e2e] text-[#f0f0f0] text-sm hover:border-[#e65100] transition-colors duration-200 ${
          itemCount > 0 ? "ring-2 ring-[#e65100]/40" : ""
        }`}
        aria-label="Open cart"
      >
        <span>Cart</span>
        {itemCount > 0 && (
          <span
            className={`min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#e65100] text-white text-xs font-bold px-1 ${
              badgePulse ? "animate-scale-in" : ""
            }`}
          >
            {itemCount}
          </span>
        )}
      </button>
    </header>
  );
}
