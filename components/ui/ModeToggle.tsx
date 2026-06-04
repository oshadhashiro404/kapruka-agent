"use client";

import { useCartStore } from "@/lib/cart-store";
import type { ChatMode } from "@/lib/types";

export default function ModeToggle() {
  const mode = useCartStore((s) => s.mode);
  const setMode = useCartStore((s) => s.setMode);

  const options: { value: ChatMode; label: string; icon: string }[] = [
    { value: "gift", label: "Gifting", icon: "🎁" },
    { value: "shopping", label: "Shopping", icon: "🛍️" },
  ];

  const active = mode === "gift" || mode === "shopping" ? mode : "shopping";

  return (
    <div className="flex rounded-full bg-elevated border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setMode(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            active === opt.value
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span className="mr-1" aria-hidden>
            {opt.icon}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
