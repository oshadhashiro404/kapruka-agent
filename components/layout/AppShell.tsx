"use client";

import type { KaprukaCategory } from "@/lib/types";
import BrowseRail from "./BrowseRail";
import BrowseSheet from "./BrowseSheet";
import CartPanel from "./CartPanel";

interface AppShellProps {
  children: React.ReactNode;
  browseOpen: boolean;
  onBrowseOpenChange: (open: boolean) => void;
  categories: KaprukaCategory[];
  categoriesLoading: boolean;
  onCategorySelect: (category: string) => void;
  onNewChat: () => void;
  onCheckoutViaChat: () => void;
  onOpenCheckoutWizard: () => void;
}

export default function AppShell({
  children,
  browseOpen,
  onBrowseOpenChange,
  categories,
  categoriesLoading,
  onCategorySelect,
  onNewChat,
  onCheckoutViaChat,
  onOpenCheckoutWizard,
}: AppShellProps) {
  return (
    <div className="flex flex-1 min-h-0 h-full max-h-[100dvh]">
      <BrowseRail
        categories={categories}
        categoriesLoading={categoriesLoading}
        onCategory={onCategorySelect}
        onNewChat={onNewChat}
      />
      <BrowseSheet
        open={browseOpen}
        onClose={() => onBrowseOpenChange(false)}
        categories={categories}
        categoriesLoading={categoriesLoading}
        onCategory={onCategorySelect}
        onNewChat={onNewChat}
      />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">{children}</div>
      <CartPanel
        onCheckout={onCheckoutViaChat}
        onOpenWizard={onOpenCheckoutWizard}
      />
    </div>
  );
}
