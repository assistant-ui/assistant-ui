import { registerMatchers } from "./matchers/register";

export type SetupOptions = unknown;

export function setupChatTestKit(_options?: SetupOptions): void {
  registerMatchers();
}
