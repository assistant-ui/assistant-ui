import type { ChatTestHarness } from "../harness/types";
import type { MatcherResult, ToolCallTarget } from "./types";

export type HarnessAwareToolCallTarget = ToolCallTarget & {
  __harness: ChatTestHarness;
};

export function toRenderResult(
  this: unknown,
  target: ToolCallTarget,
): MatcherResult {
  if (target.__kind !== "toolCall") {
    return {
      pass: false,
      message: () => "toRenderResult expects a toolCall() target",
    };
  }

  const el = document.querySelector<HTMLElement>(
    `[data-tool-name="${target.name}"]`,
  );
  if (!el) {
    return {
      pass: false,
      message: () =>
        `expected tool '${target.name}' to be rendered (looked for [data-tool-name="${target.name}"])`,
    };
  }

  const text = el.textContent ?? "";
  const pass = text.length > 0 && text !== "pending";
  return {
    pass,
    message: () =>
      pass
        ? `expected tool '${target.name}' NOT to render a result`
        : `expected tool '${target.name}' to render a result, got ${JSON.stringify(text)}`,
  };
}

export function toHaveReceivedArgs(
  this: unknown,
  target: HarnessAwareToolCallTarget,
  expected: Record<string, unknown>,
): MatcherResult {
  if (target.__kind !== "toolCall" || !("__harness" in target)) {
    return {
      pass: false,
      message: () =>
        "toHaveReceivedArgs requires toolCall(name).on(harness) — pass the harness reference",
    };
  }

  const events = target.__harness.getRuntimeSnapshot().events;
  const event = events.find(
    (item) => item.type === "tool-call" && item.toolName === target.name,
  );

  if (!event || event.type !== "tool-call") {
    return {
      pass: false,
      message: () => `tool '${target.name}' was never called`,
    };
  }

  const pass = JSON.stringify(event.args) === JSON.stringify(expected);
  return {
    pass,
    message: () =>
      pass
        ? `expected tool '${target.name}' NOT to have received ${JSON.stringify(expected)}`
        : `expected tool '${target.name}' to have received ${JSON.stringify(expected)} but got ${JSON.stringify(event.args)}`,
  };
}
