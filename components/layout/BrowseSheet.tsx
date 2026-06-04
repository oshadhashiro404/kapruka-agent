"use client";

import OrderTracker from "@/components/ui/OrderTracker";
import type { KaprukaCategory } from "@/lib/types";

interface BrowseSheetProps {
  open: boolean;
  onClose: () => void;
  categories: KaprukaCategory[];
  categoriesLoading: boolean;
  onCategory: (name: string) => void;
  onNewChat: () => void;
}

export default function BrowseSheet({
  open,
  onClose,
  categories,
  categoriesLoading,
  onCategory,
  onNewChat,
}: BrowseSheetProps) {
  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-[min(300px,85vw)] bg-surface border-r border-border z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Browse</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-muted hover:text-foreground hover:bg-elevated text-xl"
            aria-label="Close browse"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted hover:border-primary hover:text-primary transition-colors"
          >
            + New chat
          </button>
          <div>
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Categories
            </h3>
            {categoriesLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : (
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.name}>
                    <button
                      type="button"
                      onClick={() => {
                        onCategory(cat.name);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-elevated hover:text-primary transition-colors"
                    >
                      {cat.name}
                      {cat.product_count > 0 && (
                        <span className="text-muted ml-1 text-xs">
                          ({cat.product_count})
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <OrderTracker compact />
        </div>
      </aside>
    </>
  );
}
