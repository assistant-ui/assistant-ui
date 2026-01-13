import { randomUUID } from "node:crypto";

export function generateWidgetSessionId(): string {
  return `ws_${randomUUID()}`;
}
