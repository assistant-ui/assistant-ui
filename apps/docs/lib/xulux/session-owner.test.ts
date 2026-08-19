import { describe, expect, it } from "vitest";
import { createMemorySessionOwnerStore } from "./session-owner";

describe("Xulux session ownership", () => {
  it("binds a new session to its first authenticated user", async () => {
    const store = createMemorySessionOwnerStore();

    await expect(store.claim("session_123", "user_123")).resolves.toBe(true);
    await expect(store.claim("session_123", "user_123")).resolves.toBe(true);
  });

  it("rejects a different user for an existing session", async () => {
    const store = createMemorySessionOwnerStore();
    await store.claim("session_123", "user_123");

    await expect(store.claim("session_123", "user_456")).resolves.toBe(false);
  });
});
