import { expect as vitestExpect } from "vitest";
import { toBeInterrupted, toHaveText, toStreamCompletely } from "./message";
import { toHaveAssistantText, toShowError } from "./thread";
import { toHaveReceivedArgs, toRenderResult } from "./tool-call";

let registered = false;

export function registerMatchers(): void {
  if (registered) return;

  const expectInstance = (globalThis as { expect?: typeof vitestExpect })
    .expect;
  const matcherExpect = expectInstance ?? vitestExpect;

  matcherExpect.extend({
    toHaveAssistantText: toHaveAssistantText as never,
    toShowError: toShowError as never,
    toHaveText: toHaveText as never,
    toStreamCompletely: toStreamCompletely as never,
    toBeInterrupted: toBeInterrupted as never,
    toRenderResult: toRenderResult as never,
    toHaveReceivedArgs: toHaveReceivedArgs as never,
  });

  registered = true;
}
