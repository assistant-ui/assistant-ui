import { describe, expect, expectTypeOf, it } from "vitest";
import { isKnownPiSessionEntry } from "./types";
import type {
  PiAgentMessage,
  PiAnySessionEntry,
  PiSessionEntry,
} from "./types";

const baseEntry = {
  id: "entry-1",
  parentId: null,
  timestamp: "2026-07-17T00:00:00.000Z",
};

describe("isKnownPiSessionEntry", () => {
  it("distinguishes known entry types from future entry types", () => {
    const known: PiAnySessionEntry = {
      ...baseEntry,
      type: "custom",
      customType: "extension-state",
    };
    const unknown: PiAnySessionEntry = {
      ...baseEntry,
      type: "future_entry",
    };

    expect(isKnownPiSessionEntry(known)).toBe(true);
    expect(isKnownPiSessionEntry(unknown)).toBe(false);
  });

  it("preserves payload narrowing for known entries", () => {
    const assertKnownMessage = (entry: PiSessionEntry) => {
      if (entry.type !== "message") return;
      expectTypeOf(entry.message).toEqualTypeOf<PiAgentMessage>();
    };
    const assertAnyMessage = (entry: PiAnySessionEntry) => {
      if (!isKnownPiSessionEntry(entry) || entry.type !== "message") return;
      expectTypeOf(entry.message).toEqualTypeOf<PiAgentMessage>();
    };
    const message: PiAgentMessage = {
      role: "user",
      content: "Hello",
      timestamp: 0,
    };
    const entry: PiSessionEntry = {
      ...baseEntry,
      type: "message",
      message,
    };

    assertKnownMessage(entry);
    assertAnyMessage(entry);
  });
});
