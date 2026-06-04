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

  return (
    <div className="flex rounded-full bg-white/80 border border-orange-200 p-0.5 shadow-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setMode(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
            mode === opt.value
              ? "bg-primary text-white shadow"
              : "text-gray-600 hover:text-primary"
          }`}
        >
          <span className="mr-1">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
