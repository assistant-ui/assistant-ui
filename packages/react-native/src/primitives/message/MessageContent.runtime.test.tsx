import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import type { MessagePartState, ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  useAssistantDataUI,
  useAssistantToolUI,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { MessageContent } from "./MessageContent";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("MessageContent with a runtime", () => {
  it.each([
    {
      type: "image",
      part: { type: "image", image: "data:image/png;base64,iVBORw0KGgo=" },
      expected: "data:image/png;base64,iVBORw0KGgo=",
    },
    {
      type: "reasoning",
      part: { type: "reasoning", text: "thinking text" },
      expected: "thinking text",
    },
    {
      type: "source",
      part: {
        type: "source",
        sourceType: "url",
        id: "src-1",
        title: "Docs",
        url: "https://example.com/docs",
      },
      expected: "[source: Docs https://example.com/docs]",
    },
    {
      type: "file",
      part: {
        type: "file",
        filename: "report.txt",
        mimeType: "text/plain",
        data: "contents",
      },
      expected: "[file: report.txt text/plain]",
    },
  ] as const)(
    "renders a default $type part",
    async ({ type, part, expected }) => {
      const App = () => {
        const runtime = useExternalStoreRuntime({
          messages: [
            { role: "assistant", content: [part] },
          ] satisfies ThreadMessageLike[],
          convertMessage: (value) => value,
          onNew: async () => {},
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <MessageByIndexProvider index={0}>
              <MessageContent />
            </MessageByIndexProvider>
          </AssistantRuntimeProvider>
        );
      };
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        await act(async () => root.render(<App />));
        if (type === "image") {
          expect(container.querySelector("img")?.getAttribute("src")).toBe(
            expected,
          );
        } else {
          expect(container.textContent).toContain(expected);
        }
      } finally {
        await act(async () => root.unmount());
      }
    },
  );

  it.each(["tool-call", "data"] as const)(
    "renders derived status for registered %s UIs",
    async (type) => {
      const Status = ({ status }: Pick<MessagePartState, "status">) => (
        <span>{status.type}</span>
      );
      const Registrations = () => {
        useAssistantToolUI({ toolName: "search", render: Status });
        useAssistantDataUI({ name: "chart", render: Status });
        return <MessageContent />;
      };
      const App = ({ message }: { message: ThreadMessageLike }) => {
        const runtime = useExternalStoreRuntime({
          messages: [message],
          convertMessage: (value) => value,
          onNew: async () => {},
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <MessageByIndexProvider index={0}>
              <Registrations />
            </MessageByIndexProvider>
          </AssistantRuntimeProvider>
        );
      };
      const container = document.createElement("div");
      const root = createRoot(container);
      try {
        for (const status of [
          "running",
          "requires-action",
          "complete",
        ] as const) {
          if (type === "data" && status === "requires-action") continue;
          const message: ThreadMessageLike = {
            id: "m1",
            role: "assistant",
            status:
              status === "running"
                ? { type: status }
                : status === "complete"
                  ? { type: status, reason: "stop" }
                  : { type: status, reason: "tool-calls" },
            content: [
              type === "data"
                ? { type, name: "chart", data: { value: 1 } }
                : {
                    type,
                    toolName: "search",
                    toolCallId: "c1",
                    args: {},
                    argsText: "{}",
                    ...(status === "complete" ? { result: "done" } : {}),
                  },
            ],
          };
          await act(async () => root.render(<App message={message} />));
          expect(container.textContent).toBe(status);
        }
      } finally {
        await act(async () => root.unmount());
      }
    },
  );
});
