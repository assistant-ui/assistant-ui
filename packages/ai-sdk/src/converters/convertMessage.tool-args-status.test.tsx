// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPartialJsonObjectMeta } from "assistant-stream/utils";
import type { MessagePartState } from "../../../core/src/runtime/api/message-part-runtime";
import { toMessagePartStatus } from "../../../core/src/utils/normalizePartStatus";
import { useToolArgsStatus } from "../../../core/src/react/model-context/useToolArgsStatus";
import { AISDKMessageConverter } from "./convertMessage";

const state = vi.hoisted(() => ({
  part: undefined as MessagePartState | undefined,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: (selector: (value: typeof state) => unknown) => selector(state),
}));

describe("AI SDK tool argument status", () => {
  it.each([{}, { city: "Paris", unit: "c" }])(
    "completes arguments on input-available while execution continues for %j",
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
        const part = message.content.find((part) => part.type === "tool-call")!;
        return { ...part, status: toMessagePartStatus(message, 0, part) };
      };

      state.part = convert("input-streaming");
      expect(getPartialJsonObjectMeta(state.part.args)?.state).toBe("partial");
      const { result, rerender } = renderHook(() => useToolArgsStatus());
      expect(result.current.status).toBe("running");
      expect(result.current.allPropsStatus).toBe("streaming");

      state.part = convert("input-available");
      expect(state.part.args).toBe(input);
      expect(getPartialJsonObjectMeta(state.part.args)).toBeUndefined();
      expect(JSON.parse(state.part.argsText)).toEqual(input);
      rerender();
      expect(result.current.status).toBe("running");
      expect(result.current.allPropsStatus).toBe("complete");
      for (const key of Object.keys(input)) {
        expect(result.current.propStatus[key]).toBe("complete");
      }
    },
  );
});
