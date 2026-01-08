import { randomUUID } from "crypto";

export function generateWidgetSessionId(): string {
  return `ws_${randomUUID()}`;
}
