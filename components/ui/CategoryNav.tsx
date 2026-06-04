"use client";

import { CATEGORY_CHIPS } from "@/lib/occasions";

interface CategoryNavProps {
  active: string;
  onSelect: (category: string) => void;
}

export default function CategoryNav({ active, onSelect }: CategoryNavProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 border-b border-orange-100 bg-white/90">
      {CATEGORY_CHIPS.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === cat
              ? "bg-primary text-white shadow"
              : "bg-orange-50 text-gray-700 hover:bg-orange-100"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
