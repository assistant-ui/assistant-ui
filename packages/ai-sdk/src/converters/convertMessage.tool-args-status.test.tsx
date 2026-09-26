import { describe, expect, it } from "vitest";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
} from "assistant-stream/utils";
import {
  AISDKMessageConverter,
  type AISDKMessageConverterMetadata,
} from "./convertMessage";

describe("AI SDK tool argument completion", () => {
  it.each([{}, { city: "Paris", unit: "c" }])(
    "marks input-available arguments complete before tool execution ends for %j",
    (input) => {
      const convert = (toolState: "input-streaming" | "input-available") => {
        const message = AISDKMessageConverter.toThreadMessages(
          [
            {
              id: "a1",
              role: "assistant",
              parts: [
                {
                  type: "tool-weather",
                  toolCallId: "tc-1",
                  state: toolState,
                  input,
                },
              ],
            },
          ],
          true,
        )[0]!;
        return message.content.find((part) => part.type === "tool-call")!;
      };

      const streaming = convert("input-streaming");
      expect(getPartialJsonObjectMeta(streaming.args)?.state).toBe("partial");

      const available = convert("input-available");
      expect(Object.fromEntries(Object.entries(available.args))).toEqual(input);
      expect(JSON.parse(available.argsText)).toEqual(input);
      expect(getPartialJsonObjectMeta(available.args)?.state).toBe("complete");
      for (const key of Object.keys(input)) {
        expect(getPartialJsonObjectFieldState(available.args, [key])).toBe(
          "complete",
        );
      }
    },
  );

  it("keeps the streaming frontier partial until input becomes available", () => {
    const message = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "input-streaming",
              input: { city: "Paris", unit: "c" },
            },
          ],
        },
      ],
      true,
    )[0]!;
    const part = message.content.find((item) => item.type === "tool-call")!;
    expect(getPartialJsonObjectMeta(part.args)?.state).toBe("partial");
    expect(getPartialJsonObjectFieldState(part.args, ["city"])).toBe(
      "complete",
    );
    expect(getPartialJsonObjectFieldState(part.args, ["unit"])).toBe("partial");
  });

  it.each([
    {
      state: "approval-responded",
      approval: { id: "approval-1", approved: true },
    },
    {
      state: "output-available",
      output: { progress: 50 },
      preliminary: true,
    },
  ])("marks settled $state input complete while the part runs", (tool) => {
    const message = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              input: { city: "Paris" },
              ...tool,
            },
          ],
        },
      ] as any,
      true,
    )[0]!;
    const part = message.content.find((item) => item.type === "tool-call")!;
    expect(message.status?.type).toBe("running");
    expect(getPartialJsonObjectMeta(part.args)?.state).toBe("complete");
    expect(getPartialJsonObjectFieldState(part.args, ["city"])).toBe(
      "complete",
    );
  });

  it("reuses parsed arguments when the settled input object is unchanged", () => {
    const input = { city: "Paris" };
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsTextCache: new WeakMap(),
    };
    const convert = () =>
      AISDKMessageConverter.toThreadMessages(
        [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-weather",
                toolCallId: "tc-1",
                state: "input-available",
                input,
              },
            ],
          },
        ],
        true,
        metadata,
      )[0]!.content.find((part) => part.type === "tool-call")!;

    const first = convert();
    const second = convert();
    expect(first.args).toBe(second.args);
    expect(first.argsText).toBe(second.argsText);
    expect(getPartialJsonObjectMeta(second.args)?.state).toBe("complete");
  });

  it.each([
    '{"__proto__":{"polluted":true}}',
    '{"constructor":{"prototype":{"polluted":true}}}',
  ])(
    "marks settled prototype-named input complete while the tool runs: %s",
    (json) => {
      const input = JSON.parse(json);
      const message = AISDKMessageConverter.toThreadMessages(
        [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-weather",
                toolCallId: "tc-1",
                state: "input-available",
                input,
              },
            ],
          },
        ],
        true,
      )[0]!;
      const part = message.content.find((item) => item.type === "tool-call")!;

      expect(message.status?.type).toBe("running");
      expect(part.args).not.toBe(input);
      expect(Object.entries(part.args)).toEqual(Object.entries(input));
      expect(Object.getPrototypeOf(part.args)).toBe(Object.prototype);
      expect(Object.prototype).not.toHaveProperty("polluted");
      expect(JSON.parse(part.argsText)).toEqual(input);
      expect(getPartialJsonObjectMeta(part.args)?.state).toBe("complete");
      expect(
        getPartialJsonObjectFieldState(part.args, [Object.keys(input)[0]!]),
      ).toBe("complete");
    },
  );
});
