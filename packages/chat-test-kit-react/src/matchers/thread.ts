import type { ChatTestHarness } from "../harness/types";
import type { MatcherResult, ThreadTarget } from "./types";

type HarnessAwareThreadTarget = ThreadTarget & {
  __harness: ChatTestHarness;
};

export function toHaveAssistantText(
  this: unknown,
  target: HarnessAwareThreadTarget,
  expected: string | RegExp,
): MatcherResult {
  if (target.__kind !== "thread" || !("__harness" in target)) {
    return {
      pass: false,
      message: () =>
        "toHaveAssistantText requires thread().on(harness) as the target",
    };
  }

  const actual = target.__harness
    .getRuntimeSnapshot()
    .events.filter((event) => event.type === "text-delta")
    .map((event) => event.delta)
    .join("");
  const pass =
    expected instanceof RegExp
      ? expected.test(actual)
      : actual.includes(expected);

  return {
    pass,
    message: () =>
      pass
        ? `expected assistant text NOT to match ${String(expected)} but got ${JSON.stringify(actual)}`
        : `expected assistant text to match ${String(expected)} but got ${JSON.stringify(actual)}`,
  };
}

export function toShowError(
  this: unknown,
  target: ThreadTarget,
  match?: string | RegExp,
): MatcherResult {
  if (target.__kind !== "thread") {
    return {
      pass: false,
      message: () => "toShowError expects a thread() target",
    };
  }

  const domError =
    document.querySelector<HTMLElement>("[data-testid='aui-error']")
      ?.textContent ?? "";
  const text = domError;

  if (!text) {
    return {
      pass: false,
      message: () => "expected an error surface in the DOM, found none",
    };
  }

  if (match === undefined) {
    return {
      pass: true,
      message: () => "expected no error surface in the DOM",
    };
  }

  const pass =
    match instanceof RegExp ? match.test(text) : text.includes(match);
  return {
    pass,
    message: () =>
      pass
        ? `expected error text NOT to match ${String(match)} but got ${JSON.stringify(text)}`
        : `expected error text to match ${String(match)} but got ${JSON.stringify(text)}`,
  };
}
