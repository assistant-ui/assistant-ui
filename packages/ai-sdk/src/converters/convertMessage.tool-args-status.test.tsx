import { describe, expect, it } from "vitest";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
} from "assistant-stream/utils";
import { AISDKMessageConverter } from "./convertMessage";

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
});
