import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createXuluxSessionId,
  isXuluxSessionOwnedByUser,
  migrateLegacyXuluxSessionId,
  requireXuluxSessionOwner,
} from "./session-owner";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Xulux session ownership", () => {
  it("creates a session intrinsically namespaced to its Clerk user", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "123e4567-e89b-42d3-a456-426614174000",
    );

    const sessionId = createXuluxSessionId("user_123");

    expect(sessionId).toBe("user_123.123e4567-e89b-42d3-a456-426614174000");
    expect(isXuluxSessionOwnedByUser(sessionId, "user_123")).toBe(true);
  });

  it("rejects another user even when the random UUID is reused", () => {
    const randomId = "123e4567-e89b-42d3-a456-426614174000";

    expect(
      requireXuluxSessionOwner(`user_123.${randomId}`, "user_456")?.status,
    ).toBe(403);
    expect(isXuluxSessionOwnedByUser(`user_456.${randomId}`, "user_456")).toBe(
      true,
    );
  });

  it("deterministically namespaces a legacy UUID", () => {
    const randomId = "123e4567-e89b-42d3-a456-426614174000";

    expect(migrateLegacyXuluxSessionId(randomId, "user_123")).toBe(
      `user_123.${randomId}`,
    );
  });

  it.each([
    "123e4567-e89b-42d3-a456-426614174000",
    "user_123.not-a-uuid",
    `user_123.${"a".repeat(129)}`,
  ])("rejects legacy or malformed session IDs (%s)", (sessionId) => {
    expect(isXuluxSessionOwnedByUser(sessionId, "user_123")).toBe(false);
  });
});
