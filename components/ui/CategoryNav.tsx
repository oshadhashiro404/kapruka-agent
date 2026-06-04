"use client";

import type { KaprukaCategory } from "@/lib/types";

interface CategoryNavProps {
  categories: KaprukaCategory[];
  active: string;
  onSelect: (category: string) => void;
  loading?: boolean;
}

export default function CategoryNav({
  categories,
  active,
  onSelect,
  loading,
}: CategoryNavProps) {
  if (loading) {
    return (
      <div className="shrink-0 flex gap-2 px-4 py-2 border-b border-border overflow-x-auto scrollbar-hide">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="shrink-0 h-8 w-20 rounded-full bg-elevated animate-pulse"
          />
        ))}
      </div>
    );
  }

  const pills = categories.slice(0, 12);

  return (
    <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 border-b border-border bg-surface/80">
      <button
        type="button"
        onClick={() => onSelect("All")}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          active === "All"
            ? "bg-primary text-white"
            : "bg-elevated text-muted hover:text-foreground border border-border"
        }`}
      >
        All
      </button>
      {pills.map((cat) => (
        <button
          key={cat.name}
          type="button"
          onClick={() => onSelect(cat.name)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === cat.name
              ? "bg-primary text-white"
              : "bg-elevated text-muted hover:text-foreground border border-border"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
