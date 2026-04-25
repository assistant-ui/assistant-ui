import type { ChatTestHarness } from "../harness/types";
import type { MessageTarget, ThreadTarget, ToolCallTarget } from "./types";

export function thread(): ThreadTarget {
  return {
    __kind: "thread",
    on(harness: ChatTestHarness) {
      return { ...this, __harness: harness };
    },
  };
}

export function message(index: number): MessageTarget {
  if (index < 0 || !Number.isInteger(index)) {
    throw new Error("message(n): n must be a non-negative integer");
  }
  return {
    __kind: "message",
    index,
    on(harness: ChatTestHarness) {
      return { ...this, __harness: harness };
    },
  };
}

export function toolCall(name: string): ToolCallTarget {
  return {
    __kind: "toolCall",
    name,
    on(harness: ChatTestHarness) {
      return { ...this, __harness: harness };
    },
  };
}
