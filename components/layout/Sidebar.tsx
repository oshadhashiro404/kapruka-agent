"use client";

import OrderTracker from "@/components/ui/OrderTracker";
import { CATEGORY_CHIPS } from "@/lib/occasions";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onCategory: (category: string) => void;
}

export default function Sidebar({ open, onClose, onCategory }: SidebarProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-30 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl z-40 p-4 overflow-y-auto hidden lg:block border-r border-orange-100">
        <h3 className="font-bold text-secondary mb-3">Quick browse</h3>
        <ul className="space-y-1 mb-6">
          {CATEGORY_CHIPS.filter((c) => c !== "All").map((cat) => (
            <li key={cat}>
              <button
                type="button"
                onClick={() => {
                  onCategory(cat);
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 text-sm"
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
        <OrderTracker />
      </aside>
    </>
  );
}
