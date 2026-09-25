import { expect, it } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantMessageStream,
  type AssistantMessage,
  type AssistantStreamChunk,
} from "assistant-stream";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
} from "assistant-stream/utils";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveParts,
  ThreadPrimitiveMessages,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const counter = createRenderCounter();
const Text = ({ text }: { text: string }) => {
  counter.useRender("text");
  return <p>{text}</p>;
};
const Tool = () => {
  const part = useAuiState((s) => s.part);
  counter.useRender("tool");
  if (part.type !== "tool-call") return null;
  const field = getPartialJsonObjectMeta(part.args)
    ? getPartialJsonObjectFieldState(part.args, ["value"])
    : "partial";
  return (
    <output data-field={field} data-result={JSON.stringify(part.result)}>
      {String(part.args["value"] ?? "")}
    </output>
  );
};
const Message = () => (
  <MessagePrimitiveParts components={{ Text, tools: { Fallback: Tool } }} />
);
const components = { Message };
const convertMessage = (message: AssistantMessage): ThreadMessageLike => ({
  id: "assistant-1",
  role: "assistant",
  status: message.status,
  content: message.parts.flatMap<
    Exclude<ThreadMessageLike["content"][number], string>
  >((part) => {
    if (part.type === "text") return [{ type: "text", text: part.text }];
    if (part.type === "tool-call")
      return [
        {
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args,
          argsText: part.argsText,
          ...(part.result !== undefined ? { result: part.result } : {}),
        },
      ];
    return [];
  }),
});

it("streams long tool arguments through the runtime without rerendering the text sibling", async () => {
  counter.reset();
  let setMessage!: (message: AssistantMessage) => void;
  const App = () => {
    const [message, set] = useState<AssistantMessage>();
    setMessage = set;
    const runtime = useExternalStoreRuntime({
      messages: message ? [message] : [],
      isRunning: message?.status.type === "running",
      convertMessage,
      onNew: async () => {},
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitiveMessages components={components} />
      </AssistantRuntimeProvider>
    );
  };
  const container = document.createElement("div"),
    root = createRoot(container);
  let controller!: ReadableStreamDefaultController<AssistantStreamChunk>;
  const source = new ReadableStream<AssistantStreamChunk>({
    start(c) {
      controller = c;
    },
  });
  const reader =
    AssistantMessageStream.fromAssistantStream(source).readable.getReader();
  const emit = async (chunk: AssistantStreamChunk) => {
    controller.enqueue(chunk);
    const next = await reader.read();
    if (next.done) throw new Error("Stream ended early");
    await act(async () => setMessage(next.value));
    return next.value;
  };
  try {
    await act(async () => root.render(<App />));
    await emit({ type: "part-start", path: [], part: { type: "text" } });
    await emit({
      type: "text-delta",
      path: [0],
      textDelta: "Creating the document",
    });
    await emit({
      type: "part-start",
      path: [],
      part: { type: "tool-call", toolCallId: "document", toolName: "document" },
    });
    const first = await emit({
      type: "text-delta",
      path: [1],
      textDelta: '{"value":"' + "x".repeat(4096),
    });
    expect(container.querySelector("output")?.textContent).toBe(
      "x".repeat(4096),
    );
    expect(container.querySelector("output")?.getAttribute("data-field")).toBe(
      "partial",
    );
    const before = counter.snapshot();
    await emit({ type: "text-delta", path: [1], textDelta: "next" });
    expect(container.querySelector("output")?.textContent).toBe(
      "x".repeat(4096) + "next",
    );
    expect(counter.renders("tool") - (before["renders:tool"] ?? 0)).toBe(1);
    expect(counter.renders("text") - (before["renders:text"] ?? 0)).toBe(0);
    await emit({ type: "text-delta", path: [1], textDelta: '"}' });
    expect(container.querySelector("output")?.getAttribute("data-field")).toBe(
      "complete",
    );
    await emit({ type: "tool-call-args-text-finish", path: [1] });
    await emit({
      type: "result",
      path: [1],
      result: { saved: true },
      isError: false,
    });
    expect(container.querySelector("output")?.getAttribute("data-result")).toBe(
      '{"saved":true}',
    );
    expect(container.querySelector("p")?.textContent).toBe(
      "Creating the document",
    );
    const old = first.parts[1];
    if (old?.type !== "tool-call") throw new Error("Missing tool call");
    expect(old.args["value"]).toBe("x".repeat(4096));
    expect(getPartialJsonObjectFieldState(old.args, ["value"])).toBe("partial");
    controller.close();
    while (!(await reader.read()).done) {}
  } finally {
    await reader.cancel();
    reader.releaseLock();
    await act(async () => root.unmount());
  }
});
