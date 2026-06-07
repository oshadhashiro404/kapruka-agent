"use client";

import OrderTracker from "@/components/ui/OrderTracker";
import { OCCASION_TILES } from "@/lib/occasions";
import type { KaprukaCategory } from "@/lib/types";

interface OccasionGridProps {
  onSelect: (message: string) => void;
  onCategorySelect: (category: string) => void;
  categories: KaprukaCategory[];
  categoriesLoading: boolean;
}

export default function OccasionGrid({
  onSelect,
  onCategorySelect,
  categories,
  categoriesLoading,
}: OccasionGridProps) {
  const pills = categories.slice(0, 10);

  return (
    <div className="w-full min-h-[min(70vh,600px)] flex flex-col justify-center py-8 px-1 animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Hi! I&apos;m your Kapruka shopping buddy
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mt-3 rounded-full" />
        <p className="font-sinhala text-sm text-primary/90 mt-3">
          ආයුබෝවන්! මම ඔබේ Kapruka shopping buddy
        </p>
        <p className="text-sm text-muted mt-3 max-w-md mx-auto leading-relaxed">
          What are you looking for today? Search gifts, cakes, flowers,
          electronics — check delivery across Sri Lanka and checkout in minutes.
        </p>
      </div>

      {!categoriesLoading && pills.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-muted mb-2 px-1 uppercase tracking-wide text-center">
            Browse categories
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {pills.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() =>
                  onCategorySelect(cat.name)
                }
                className="px-4 py-2 rounded-full text-sm bg-elevated border border-border text-foreground hover:border-primary/40 hover:bg-surface transition-all"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs font-medium text-muted mb-3 px-1 uppercase tracking-wide text-center">
        Quick starts
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto w-full">
        {OCCASION_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onSelect(tile.message)}
            className="flex flex-col items-start gap-1 px-4 py-3.5 rounded-xl bg-elevated border border-border hover:border-primary/40 hover:bg-surface transition-all duration-200 text-left active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span className="text-2xl leading-none" aria-hidden>
              {tile.emoji}
            </span>
            <span className="text-sm font-medium text-foreground">
              {tile.label}
            </span>
            <span className="font-sinhala text-xs text-muted">
              {tile.labelSinhala}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 max-w-md mx-auto w-full">
        <OrderTracker compact />
      </div>
    </div>
  );
}
