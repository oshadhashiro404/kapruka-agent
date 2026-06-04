import type { OccasionTile } from "./types";

export const OCCASION_TILES: OccasionTile[] = [
  {
    id: "birthday",
    emoji: "🎂",
    label: "Birthday",
    labelSinhala: "උපන් දිනය",
    message: "I want to find a birthday gift",
    category: "Gifts",
  },
  {
    id: "wedding",
    emoji: "💍",
    label: "Wedding",
    labelSinhala: "විවාහ",
    message: "I need a wedding gift",
    category: "Gifts",
  },
  {
    id: "flowers",
    emoji: "🌸",
    label: "Flowers",
    labelSinhala: "මල්",
    message: "Show me flowers and bouquets",
    category: "Flowers",
  },
  {
    id: "baby",
    emoji: "👶",
    label: "New Baby",
    labelSinhala: "දරුවා",
    message: "I'm looking for a new baby gift",
    category: "Gifts",
  },
  {
    id: "avurudu",
    emoji: "🌸",
    label: "Avurudu",
    labelSinhala: "ආවුරුදු",
    message: "I need gifts for Avurudu season",
    category: "Gift Combos",
  },
  {
    id: "exams",
    emoji: "🎓",
    label: "Exams",
    labelSinhala: "විභාග",
    message: "I want a gift to celebrate exam results",
    category: "Gifts",
  },
  {
    id: "shopping",
    emoji: "🛍️",
    label: "Just Shopping",
    labelSinhala: "සාප්පු",
    message: "I want to browse what's available",
    category: "All",
  },
  {
    id: "electronics",
    emoji: "📱",
    label: "Electronics",
    labelSinhala: "ඉලෙක්ට්‍රොනික",
    message: "Show me electronics products",
    category: "Electronics",
  },
  {
    id: "home",
    emoji: "🏠",
    label: "Home & Living",
    labelSinhala: "නිවස",
    message: "Show me home and kitchen products",
    category: "Home & Kitchen",
  },
];

export const CATEGORY_CHIPS = [
  "All",
  "Gifts",
  "Cakes & Sweets",
  "Flowers",
  "Clothing",
  "Electronics",
  "Home & Kitchen",
  "Books",
  "Beauty",
  "Toys",
  "Sports",
] as const;

export type CategoryChip = (typeof CATEGORY_CHIPS)[number];
