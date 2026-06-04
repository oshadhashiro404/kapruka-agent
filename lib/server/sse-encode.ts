import type { SseEvent } from "./types";

export function encodeSseEvent(event: SseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
