import type { ReactNode } from "react";

const ICON_PROPS = {
  width: 12,
  height: 12,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function BagIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function ShirtIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z" />
    </svg>
  );
}

function FlowerIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m7.5 0a4.5 4.5 0 1 1-4.5 4.5m4.5-4.5H15m-3 4.5V15" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" />
      <path d="M7 8v3" />
      <path d="M12 8v3" />
      <path d="M17 8v3" />
      <path d="M7 4h.01" />
      <path d="M12 4h.01" />
      <path d="M17 4h.01" />
    </svg>
  );
}

function GroceryIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <path d="M6 17h12" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function WatchIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 10v2l1 1" />
      <path d="M16.13 7.66 18 4" />
      <path d="M7.87 7.66 6 4" />
    </svg>
  );
}

const CATEGORY_PATTERNS: { pattern: RegExp; icon: () => ReactNode }[] = [
  { pattern: /electronic|phone|mobile|gadget|computer|laptop|tablet|audio|earbud/i, icon: PhoneIcon },
  { pattern: /cloth|apparel|wear|fashion|shirt|dress|shoe|men|women/i, icon: ShirtIcon },
  { pattern: /flower|bouquet|rose|plant/i, icon: FlowerIcon },
  { pattern: /cake|bakery|sweet|chocolate|dessert/i, icon: CakeIcon },
  { pattern: /grocery|grocer|food|pantry|fruit|vegetable|organic/i, icon: GroceryIcon },
  { pattern: /gift|hamper|present/i, icon: GiftIcon },
  { pattern: /watch|jewel|accessory/i, icon: WatchIcon },
];

export function getCategoryIcon(category: string): ReactNode {
  const normalized = category.trim();
  if (!normalized) return <BagIcon />;

  for (const { pattern, icon: Icon } of CATEGORY_PATTERNS) {
    if (pattern.test(normalized)) return <Icon />;
  }

  return <BagIcon />;
}

export function getCategoryLabel(category: string): string {
  const trimmed = category.trim();
  return trimmed || "Shop";
}
