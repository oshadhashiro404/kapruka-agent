"use client";

import { useEffect, useRef, useState } from "react";
import ModeToggle from "@/components/ui/ModeToggle";
import { useCartStore } from "@/lib/cart-store";
import { formatLKR } from "@/lib/utils";

interface HeaderProps {
  onCartClick: () => void;
  onBrowseClick?: () => void;
}

export default function Header({ onCartClick, onBrowseClick }: HeaderProps) {
  const itemCount = useCartStore((s) => s.itemCount());
  const totalLkr = useCartStore((s) => s.totalLkr());
  const delivery = useCartStore((s) => s.deliveryCostLkr);
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
    <header className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-surface border-b border-border">
      <div className="flex items-center gap-2 min-w-0">
        {onBrowseClick && (
          <button
            type="button"
            onClick={onBrowseClick}
            className="lg:hidden shrink-0 w-9 h-9 rounded-lg border border-border text-muted hover:text-foreground hover:border-primary/40 flex items-center justify-center"
            aria-label="Open browse menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight tracking-tight truncate">
            Kapruka
          </h1>
          <p className="font-sinhala text-[10px] text-muted">Shopping buddy · Chat</p>
        </div>
      </div>
      <div className="hidden lg:block shrink-0">
        <ModeToggle />
      </div>
      <button
        type="button"
        onClick={onCartClick}
        className={`lg:hidden relative flex items-center gap-2 px-3 py-2 rounded-full bg-elevated border border-border text-foreground text-sm hover:border-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          itemCount > 0 ? "ring-2 ring-primary/30" : ""
        }`}
        aria-label="Open cart"
      >
        <span>Cart</span>
        {itemCount > 0 && (
          <>
            <span className="text-xs text-muted hidden sm:inline">
              {formatLKR(totalLkr + delivery)}
            </span>
            <span
              className={`min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold px-1 ${
                badgePulse ? "animate-scale-in" : ""
              }`}
            >
              {itemCount}
            </span>
          </>
        )}
      </button>
    </header>
  );
}
