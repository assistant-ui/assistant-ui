import type { ChatTestHarness } from "../harness/types";

export type ThreadTarget = {
  __kind: "thread";
  on(harness: ChatTestHarness): ThreadTarget & { __harness: ChatTestHarness };
};

export type MessageTarget = {
  __kind: "message";
  index: number;
  on(harness: ChatTestHarness): MessageTarget & { __harness: ChatTestHarness };
};

export type ToolCallTarget = {
  __kind: "toolCall";
  name: string;
  on(harness: ChatTestHarness): ToolCallTarget & { __harness: ChatTestHarness };
};

export type MatcherResult = { pass: boolean; message: () => string };
