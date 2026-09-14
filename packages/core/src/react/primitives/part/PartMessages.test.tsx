// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { useAuiState } from "@assistant-ui/store";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import type { ThreadMessage } from "../../../types/message";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../../runtimes/useExternalStoreRuntime";
import { MessagePrimitiveParts } from "../message/MessageParts";
import { ThreadPrimitiveMessages } from "../thread/ThreadMessages";
import { PartPrimitiveMessages } from "./PartMessages";

const checkPartMessagesProps = () => {
  <PartPrimitiveMessages>{() => null}</PartPrimitiveMessages>;
  <PartPrimitiveMessages components={{ Message: () => null }} />;

  // @ts-expect-error neither components nor children is allowed
  <PartPrimitiveMessages />;
  // @ts-expect-error components must be defined, not undefined
  <PartPrimitiveMessages components={undefined} />;
  // @ts-expect-error components and children are mutually exclusive
  <PartPrimitiveMessages components={{ Message: () => null }}>
    {() => null}
  </PartPrimitiveMessages>;
};
expectTypeOf(checkPartMessagesProps).toEqualTypeOf<() => void>();

const nestedAssistant: ThreadMessage = {
  id: "nested-assistant",
  createdAt: new Date(0),
  role: "assistant",
  content: [],
  status: { type: "running" },
  metadata: {
    unstable_state: {},
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

const NestedThreadStatus = () => {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  return (
    <output data-testid="nested-thread-running">{String(isRunning)}</output>
  );
};

afterEach(cleanup);

describe("PartPrimitiveMessages", () => {
  it("reports the nested thread as running", () => {
    const App = () => {
      const runtime = useExternalStoreRuntime({
        messages: [
          {
            id: "outer-assistant",
            createdAt: new Date(0),
            role: "assistant" as const,
            content: [
              {
                type: "tool-call" as const,
                toolCallId: "delegate-1",
                toolName: "delegate",
                args: {},
                argsText: "",
                messages: [nestedAssistant],
              },
            ],
            status: { type: "running" as const },
            metadata: {
              unstable_state: {},
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          },
        ],
        isRunning: true,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitiveMessages>
            {() => (
              <MessagePrimitiveParts>
                {({ part }) =>
                  part.type === "tool-call" ? (
                    <PartPrimitiveMessages>
                      {() => <NestedThreadStatus />}
                    </PartPrimitiveMessages>
                  ) : null
                }
              </MessagePrimitiveParts>
            )}
          </ThreadPrimitiveMessages>
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    expect(screen.getByTestId("nested-thread-running").textContent).toBe(
      "true",
    );
  });
});
