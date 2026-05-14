import { describe, expect, it } from "vitest";
import {
  getActiveTopAnchorAnchorId,
  getActiveTopAnchorTargetId,
  getActiveTopAnchorTurn,
} from "./topAnchorTurn";

describe("topAnchorTurn", () => {
  it("does not activate history-loaded messages", () => {
    const messages = [
      { id: "user-1", role: "user" },
      { id: "assistant-1", role: "assistant" },
    ];

    expect(getActiveTopAnchorTurn({ isRunning: false, messages })).toBe(null);
  });

  it("activates the live user/assistant pair while running", () => {
    const messages = [
      { id: "assistant-1", role: "assistant" },
      { id: "user-2", role: "user" },
      { id: "assistant-2", role: "assistant" },
    ];

    expect(getActiveTopAnchorTurn({ isRunning: true, messages })).toEqual({
      anchorId: "user-2",
      targetId: "assistant-2",
    });
    expect(getActiveTopAnchorAnchorId({ isRunning: true, messages })).toBe(
      "user-2",
    );
    expect(getActiveTopAnchorTargetId({ isRunning: true, messages })).toBe(
      "assistant-2",
    );
  });

  it("ignores running states without a trailing user/assistant pair", () => {
    const messages = [
      { id: "user-1", role: "user" },
      { id: "assistant-1", role: "assistant" },
      { id: "user-2", role: "user" },
    ];

    expect(getActiveTopAnchorTurn({ isRunning: true, messages })).toBe(null);
  });
});
