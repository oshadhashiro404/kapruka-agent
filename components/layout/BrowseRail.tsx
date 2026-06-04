"use client";

import ModeToggle from "@/components/ui/ModeToggle";
import OrderTracker from "@/components/ui/OrderTracker";
import type { KaprukaCategory } from "@/lib/types";

interface BrowseRailProps {
  categories: KaprukaCategory[];
  categoriesLoading: boolean;
  onCategory: (name: string) => void;
  onNewChat: () => void;
}

export default function BrowseRail({
  categories,
  categoriesLoading,
  onCategory,
  onNewChat,
}: BrowseRailProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-r border-border bg-surface h-full min-h-0">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-xs text-muted uppercase tracking-wide mb-2">Mode</p>
        <ModeToggle />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full mb-4 py-2 rounded-xl border border-dashed border-border text-sm text-muted hover:border-primary hover:text-primary transition-colors"
        >
          + New chat
        </button>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 px-1">
          Categories
        </h3>
        {categoriesLoading ? (
          <p className="text-sm text-muted px-1">Loading…</p>
        ) : (
          <ul className="space-y-0.5">
            {categories.map((cat) => (
              <li key={cat.name}>
                <button
                  type="button"
                  onClick={() => onCategory(cat.name)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-elevated hover:text-primary transition-colors"
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="shrink-0 p-3 border-t border-border">
        <OrderTracker compact />
      </div>
    </aside>
  );
}
