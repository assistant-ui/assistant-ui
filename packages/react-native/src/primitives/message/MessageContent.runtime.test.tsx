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
