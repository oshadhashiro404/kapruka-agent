export const GIFT_MESSAGE_TEMPLATES: Record<string, string> = {
  birthday: "ඔබට සුභ උපන් දිනයක් වේවා! 🎂",
  wedding: "ඔබේ විවාහ දිනය සුභ වේවා! 💍",
  newyear: "සුභ අලුත් අවුරුද්දක් වේවා! 🌸",
  avurudu: "සුභ අලුත් අවුරුද්දක් වේවා! 🌸",
  baby: "නව දරු ලාභය සුභ වේවා! 👶",
  exams: "ඔබේ විභාග ජය ගැනීම සුභ වේවා! 🎓",
  general: "සුභ පැතුම්! 🎁",
};

export const CITY_ALIASES: Record<string, string> = {
  kolomba: "Colombo",
  colombo: "Colombo",
  kandy: "Kandy",
  maha: "Kandy",
  galle: "Galle",
  matara: "Matara",
  negombo: "Negombo",
  jaffna: "Jaffna",
  ratnapura: "Ratnapura",
  badulla: "Badulla",
  anuradhapura: "Anuradhapura",
  polonnaruwa: "Polonnaruwa",
  kurunegala: "Kurunegala",
  gampaha: "Gampaha",
  nugegoda: "Nugegoda",
  dehiwala: "Dehiwala",
  moratuwa: "Moratuwa",
  batticaloa: "Batticaloa",
  trincomalee: "Trincomalee",
};

export function resolveCityAlias(input: string): string {
  const key = input.trim().toLowerCase();
  return CITY_ALIASES[key] ?? input;
}

export function getCitySuggestions(partial: string): string[] {
  const key = partial.trim().toLowerCase();
  if (!key) return Object.values(CITY_ALIASES).slice(0, 5);
  const unique = new Set<string>();
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (alias.includes(key) || canonical.toLowerCase().includes(key)) {
      unique.add(canonical);
    }
  }
  return Array.from(unique).slice(0, 5);
}
