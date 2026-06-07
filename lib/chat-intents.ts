import type { ChatMode } from "./types";

export function wantsAddFirstProduct(text: string): boolean {
  return /\b(add|put)\b.*\b(first|1st)\b/i.test(text.trim());
}

export function wantsRemoveFirstProduct(text: string): boolean {
  return /\b(remove|delete)\b.*\b(first|1st)\b/i.test(text.trim());
}

export function wantsClearCart(text: string): boolean {
  return /\bclear\b.*\bcart\b/i.test(text.trim());
}

export function isCheckoutChip(chip: string): boolean {
  return /checkout|pay/i.test(chip);
}

export function inferModeFromMessage(text: string, currentMode: ChatMode): ChatMode {
  if (currentMode !== "auto") return currentMode;
  return /gift|present|birthday|wedding|avurudu|vesak|මල|තෑග්/i.test(text)
    ? "gift"
    : "shopping";
}

export function isGiftIntent(text: string): boolean {
  return /gift|present|birthday|wedding|avurudu|vesak|මල|තෑග්/i.test(text);
}
