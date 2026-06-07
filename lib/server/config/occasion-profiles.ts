/** Emotional + catalog hints for relevance scoring and smart search */
export interface OccasionProfile {
  mustHave: string[];
  avoid: string[];
  categories: string[];
  alternateQueries: string[];
  emotionalTone: string;
}

export const OCCASION_PROFILES: Record<string, OccasionProfile> = {
  apology: {
    mustHave: ["rose", "roses", "bouquet", "flower", "flowers", "lily", "orchid"],
    avoid: ["phone", "laptop", "electronics", "toy", "book", "grocery", "tool"],
    categories: ["flowers", "gift combos", "chocolates"],
    alternateQueries: ["red roses bouquet", "flower bouquet apology", "roses dozen"],
    emotionalTone: "sincere, thoughtful, not flashy — she needs to feel you tried",
  },
  birthday: {
    mustHave: ["birthday", "cake", "candle", "celebration", "gift"],
    avoid: ["funeral", "sympathy", "condolence"],
    categories: ["cakes", "gifts", "gift combos", "chocolates", "flowers"],
    alternateQueries: ["birthday cake", "birthday gift hamper", "birthday flowers"],
    emotionalTone: "joyful, celebratory, personal",
  },
  wedding: {
    mustHave: ["wedding", "marriage", "couple", "hamper", "gift"],
    avoid: ["birthday", "baby", "condolence"],
    categories: ["gifts", "gift combos", "flowers", "jewelry"],
    alternateQueries: ["wedding gift", "wedding hamper", "wedding flowers"],
    emotionalTone: "elegant, meaningful, lasting impression",
  },
  romantic: {
    mustHave: ["rose", "roses", "chocolate", "romantic", "love", "heart", "bouquet"],
    avoid: ["baby", "funeral", "office", "tool"],
    categories: ["flowers", "chocolates", "gift combos"],
    alternateQueries: ["red roses", "romantic chocolate gift", "love bouquet"],
    emotionalTone: "intimate, warm, not cheesy unless they want grand",
  },
  baby: {
    mustHave: ["baby", "newborn", "infant", "child"],
    avoid: ["romantic", "wine", "alcohol", "adult"],
    categories: ["gifts", "toys", "gift combos"],
    alternateQueries: ["new baby gift", "baby shower gift", "newborn hamper"],
    emotionalTone: "gentle, practical, sweet",
  },
  avurudu: {
    mustHave: ["avurudu", "new year", "traditional", "sweet", "hamper"],
    avoid: ["christmas", "valentine"],
    categories: ["gift combos", "groceries", "cakes"],
    alternateQueries: ["avurudu gift", "sinhala new year hamper", "avurudu sweet"],
    emotionalTone: "festive, culturally warm, family-oriented",
  },
  exams: {
    mustHave: ["congratulations", "congrats", "success", "achievement", "gift"],
    avoid: ["sympathy", "condolence", "romantic"],
    categories: ["gifts", "chocolates", "gift combos"],
    alternateQueries: ["congratulations gift", "exam success gift", "graduation gift"],
    emotionalTone: "proud, encouraging, celebratory",
  },
  general: {
    mustHave: ["gift"],
    avoid: [],
    categories: ["gifts", "gift combos"],
    alternateQueries: ["gift hamper", "popular gift"],
    emotionalTone: "helpful, thoughtful",
  },
};

export function getOccasionProfile(occasion?: string | null): OccasionProfile {
  if (occasion && OCCASION_PROFILES[occasion]) {
    return OCCASION_PROFILES[occasion];
  }
  return OCCASION_PROFILES.general;
}
