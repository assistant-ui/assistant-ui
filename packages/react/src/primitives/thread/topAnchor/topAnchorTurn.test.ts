import { describe, expect, it } from "vitest";
import {
  getActiveTopAnchorAnchorId,
  getActiveTopAnchorTargetId,
  getActiveTopAnchorTurn,
  isTopAnchorTurnValid,
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

  it("keeps a completed turn valid while its messages remain in the branch", () => {
    const turn = { anchorId: "user-2", targetId: "assistant-2" };

    expect(
      isTopAnchorTurnValid(turn, [
        { id: "assistant-1" },
        { id: "user-2" },
        { id: "assistant-2" },
      ]),
    ).toBe(true);
  });

  it.each([
    ["thread switch", [{ id: "other-user" }, { id: "other-assistant" }]],
    ["new chat", []],
    ["last-turn deletion", [{ id: "older-assistant" }]],
    ["branch swap", [{ id: "branch-user" }, { id: "branch-assistant" }]],
  ])("invalidates a stored turn after %s", (_transition, messages) => {
    expect(
      isTopAnchorTurnValid(
        { anchorId: "user-2", targetId: "assistant-2" },
        messages,
      ),
    ).toBe(false);
  });
});
