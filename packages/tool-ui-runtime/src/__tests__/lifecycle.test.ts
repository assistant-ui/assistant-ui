import { describe, it, expect } from "vitest";
import {
  assertValidToolUILifecycleTransition,
  type ToolUILifecycleState,
} from "../core/lifecycle";

describe("Tool UI lifecycle transitions", () => {
  it("allows all valid lifecycle transitions", () => {
    const validTransitions: Array<
      [ToolUILifecycleState, ToolUILifecycleState]
    > = [
      ["created", "resolved"],
      ["resolved", "mounting"],
      ["mounting", "active"],
      ["active", "updating"],
      ["updating", "active"],
      ["active", "closing"],
      ["closing", "closed"],
    ];

    for (const [from, to] of validTransitions) {
      expect(() =>
        assertValidToolUILifecycleTransition(from, to),
      ).not.toThrow();
    }
  });

  it("throws on invalid lifecycle transitions", () => {
    const invalidTransitions: Array<
      [ToolUILifecycleState, ToolUILifecycleState]
    > = [
      ["created", "active"],
      ["created", "closed"],
      ["active", "resolved"],
      ["closed", "created"],
      ["closed", "active"],
      ["mounting", "closing"],
    ];

    for (const [from, to] of invalidTransitions) {
      expect(() =>
        assertValidToolUILifecycleTransition(from, to),
      ).toThrowError();
    }
  });
});
