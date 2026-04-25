import type { MatcherResult, MessageTarget } from "./types";
import type { ChatTestHarness } from "../harness/types";

type HarnessAwareMessageTarget = MessageTarget & {
  __harness: ChatTestHarness;
};

function getMessageElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-message-id]"),
  );
}

function getNthMessage(index: number): HTMLElement | null {
  return getMessageElements()[index] ?? null;
}

export function toHaveText(
  this: unknown,
  target: MessageTarget,
  expected: string,
): MatcherResult {
  if (target.__kind !== "message") {
    return {
      pass: false,
      message: () => "toHaveText expects a message() target",
    };
  }

  const element = getNthMessage(target.index);
  if (!element) {
    return {
      pass: false,
      message: () => `message(${target.index}) not found in DOM`,
    };
  }

  const text = element.textContent ?? "";
  const pass = text.includes(expected);
  return {
    pass,
    message: () =>
      pass
        ? `expected message(${target.index}) NOT to contain ${JSON.stringify(expected)}`
        : `expected message(${target.index}) to contain ${JSON.stringify(expected)} but got ${JSON.stringify(text)}`,
  };
}

export function toStreamCompletely(
  this: unknown,
  target: HarnessAwareMessageTarget,
): MatcherResult {
  if (target.__kind !== "message" || !("__harness" in target)) {
    return {
      pass: false,
      message: () =>
        "toStreamCompletely requires message(n).on(harness) as the target",
    };
  }

  const element = getNthMessage(target.index);
  if (!element) {
    return { pass: false, message: () => `message(${target.index}) not found` };
  }

  const replayState = target.__harness.getReplayState();
  const pass = replayState?.phase === "complete";
  return {
    pass,
    message: () =>
      `expected message(${target.index}) to be completed, got replay phase ${JSON.stringify(replayState?.phase ?? null)}`,
  };
}

export function toBeInterrupted(
  this: unknown,
  target: HarnessAwareMessageTarget,
): MatcherResult {
  if (target.__kind !== "message" || !("__harness" in target)) {
    return {
      pass: false,
      message: () =>
        "toBeInterrupted requires message(n).on(harness) as the target",
    };
  }

  const element = getNthMessage(target.index);
  if (!element) {
    return { pass: false, message: () => `message(${target.index}) not found` };
  }

  const replayState = target.__harness.getReplayState();
  const pass =
    replayState?.phase === "error" || replayState?.phase === "cancelled";

  return {
    pass,
    message: () =>
      `expected message(${target.index}) to be interrupted, got replay phase ${JSON.stringify(replayState?.phase ?? null)}`,
  };
}
