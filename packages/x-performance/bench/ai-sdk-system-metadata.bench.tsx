import { useAISDKRuntime } from "@assistant-ui/ai-sdk";
import type { AssistantRuntime } from "@assistant-ui/core";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, inject, test } from "vitest";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const helpers = {
  id: "system-metadata",
  status: "ready" as const,
  error: undefined,
  sendMessage: async () => {},
  regenerate: async () => {},
  resumeStream: async () => {},
  clearError: () => {},
  addToolResult: async () => {},
  addToolOutput: async () => {},
  addToolApprovalResponse: async () => {},
  stop: async () => {},
};

describe("ai-sdk: system-message metadata conversion through the runtime", () => {
  for (const [count, distinct] of [
    [2, false],
    [16, false],
    [128, true],
    [512, true],
  ] as const) {
    const label = `${count} parts, ${distinct ? "distinct providers (stress)" : "one repeated provider"}`;
    test(label, async ({ bench }) => {
      const parts = Array.from({ length: count }, (_, index) =>
        Object.freeze({
          type: "text" as const,
          text: index + ",",
          providerMetadata: Object.freeze({
            [distinct ? `provider_${index}` : "provider"]: Object.freeze({
              index,
            }),
          }),
        }),
      );
      const initial = { id: "system", role: "system" as const, parts };
      let runtime!: AssistantRuntime;
      let setMessage!: (message: typeof initial) => void;
      const App = () => {
        const [message, set] = useState(initial);
        setMessage = set;
        runtime = useAISDKRuntime({
          ...helpers,
          messages: [message],
          setMessages: () => {},
        });
        return null;
      };
      const root = createRoot(document.createElement("div"));
      let ending = "a";
      const tick = async () => {
        ending = ending === "a" ? "b" : "a";
        await act(() =>
          setMessage({
            ...initial,
            parts: [...parts.slice(0, -1), { ...parts.at(-1)!, text: ending }],
          }),
        );
      };
      const check = () => {
        const content = runtime.thread.getState().messages[0]!.content;
        expect(content).toHaveLength(1);
        expect(content[0]).toMatchObject({
          type: "text",
          text:
            parts
              .slice(0, -1)
              .map((part) => part.text)
              .join("") + ending,
        });
        const textPart = content.find((part) => part.type === "text")!;
        expect(textPart.providerMetadata).toStrictEqual(
          distinct
            ? Object.fromEntries(
                Array.from({ length: count }, (_, index) => [
                  `provider_${index}`,
                  { index },
                ]),
              )
            : { provider: { index: count - 1 } },
        );
      };
      try {
        await act(() => root.render(createElement(App)));
        await tick();
        check();
        await bench(label, tick).run(inject("benchSampling"));
        check();
      } finally {
        await act(() => root.unmount());
      }
    });
  }
});
