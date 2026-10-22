// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { UIMessage } from "ai";
import type { Unstable_ToolInteractionLog } from "@assistant-ui/core";
import { useExternalMessageConverter } from "@assistant-ui/core/react";
import { describe, expect, it, vi } from "vitest";
import {
  AISDKMessageConverter,
  convertAISDKMessage,
  createAISDKMetadataKey,
  type AISDKMessageConverterMetadata,
} from "./convertMessage";

const messages: UIMessage[] = [
  { id: "u0", role: "user", parts: [{ type: "text", text: "weather?" }] },
  {
    id: "a1",
    role: "assistant",
    parts: [
      {
        type: "tool-weather",
        toolCallId: "call-1",
        state: "output-available",
        input: { city: "NYC" },
        output: { temp: 72 },
      },
    ],
  },
  { id: "u2", role: "user", parts: [{ type: "text", text: "and Paris?" }] },
  {
    id: "a3",
    role: "assistant",
    parts: [
      {
        type: "tool-weather",
        toolCallId: "call-3",
        state: "input-available",
        input: { city: "Paris" },
      },
    ],
  },
  { id: "u4", role: "user", parts: [{ type: "text", text: "deploy" }] },
  {
    id: "a5",
    role: "assistant",
    parts: [
      {
        type: "tool-deploy",
        toolCallId: "call-5",
        state: "approval-requested",
        input: { target: "prod" },
        approval: { id: "approval-5" },
      },
    ],
  },
  { id: "u6", role: "user", parts: [{ type: "text", text: "thanks" }] },
  { id: "a7", role: "assistant", parts: [{ type: "text", text: "done" }] },
];
const ALL_IDS = messages.map((message) => message.id);

// Keyed by every metadata field, so adding one fails typecheck until its
// invalidation is pinned here.
const fieldChanges: {
  [K in keyof Required<AISDKMessageConverterMetadata>]: [
    value: AISDKMessageConverterMetadata[K],
    reconverts: readonly string[],
  ];
} = {
  toolStatuses: [
    {
      "call-3": {
        type: "interrupt",
        payload: { type: "human", payload: { question: "unit?" } },
      },
    },
    ["a3"],
  ],
  toolArtifacts: [new Map([["call-3", { chart: true }]]), ["a3"]],
  toolInteractions: [
    new Map([
      [
        "call-3",
        {
          entries: [{ type: "progress", payload: { step: 1 }, timestamp: 1 }],
        } as unknown as Unstable_ToolInteractionLog,
      ],
    ]),
    ["a3"],
  ],
  toolApprovalResponses: [
    new Map([["approval-5", { approvalId: "approval-5", approved: true }]]),
    ["a5"],
  ],
  cancelledToolApprovalIds: [new Set(["approval-5"]), ["a5"]],
  cancelledStatusMessageIds: [new Set(["a3"]), ["a3"]],
  messageTiming: [
    {
      a7: {
        streamStartTime: 1,
        totalStreamTime: 5,
        totalChunks: 3,
        toolCallCount: 1,
      },
    },
    ["a7"],
  ],
  optimisticMessageId: ["a7", ["a7"]],
  supportsRichToolApprovalResponses: [true, ALL_IDS],
  createdAtCache: [new Map(), ALL_IDS],
  toolLastInputCache: [new Map(), ALL_IDS],
  toolArgsKeyOrderCache: [new Map(), ALL_IDS],
  toolArgsTextCache: [new WeakMap(), ALL_IDS],
  mcpAppMetadataCache: [new Map(), ALL_IDS],
  // Core applies these after the callback, so no message re-converts.
  error: ["boom", []],
  cancelledMessageIds: [new Set(["a7"]), []],
};

const scenarios: {
  name: string;
  patch: Partial<AISDKMessageConverterMetadata>;
  reconverts: readonly string[];
}[] = [
  ...Object.entries(fieldChanges).map(([name, [value, reconverts]]) => ({
    name,
    patch: { [name]: value },
    reconverts,
  })),
  {
    name: "an unrelated tool status",
    patch: { toolStatuses: { "call-unknown": { type: "executing" } } },
    reconverts: [],
  },
];

describe("createAISDKMetadataKey", () => {
  it.each(scenarios)(
    "re-converts only the affected messages when $name changes and reverts",
    ({ patch, reconverts }) => {
      const callback = vi.fn(convertAISDKMessage);
      const getMetadataKey = createAISDKMetadataKey();
      // A shared createdAt cache keeps the uncached comparison's dates equal.
      const base: AISDKMessageConverterMetadata = { createdAtCache: new Map() };
      const { result, rerender } = renderHook(
        (metadata: AISDKMessageConverterMetadata) =>
          useExternalMessageConverter({
            callback,
            messages,
            isRunning: false,
            metadata,
            getMetadataKey,
          }),
        { initialProps: base },
      );
      expect(callback).toHaveBeenCalledTimes(messages.length);

      for (const metadata of [{ ...base, ...patch }, { ...base }]) {
        callback.mockClear();
        rerender(metadata);

        expect(callback.mock.calls.map(([message]) => message.id)).toEqual(
          reconverts,
        );
        expect([...result.current]).toEqual(
          AISDKMessageConverter.toThreadMessages(messages, false, metadata),
        );
      }
    },
  );
});
