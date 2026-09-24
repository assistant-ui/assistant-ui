import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import type { LangChainMessage } from "./types";
import type { LangGraphStreamCallback } from "./useLangGraphMessages";

// The converter is stubbed to skip entries without a string name, as #8141
// makes it do, so these tests exercise only the runtime's own reads of
// tool_calls. The stub goes once #8141 is on main.
vi.mock("./convertLangChainMessages", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./convertLangChainMessages")>();
  return {
    ...actual,
    convertLangChainMessages: ((message, metadata) =>
      actual.convertLangChainMessages(
        message.type === "ai" && message.tool_calls
          ? {
              ...message,
              tool_calls: message.tool_calls.filter(
                (call) => typeof call?.name === "string",
              ),
            }
          : message,
        metadata,
      )) satisfies typeof actual.convertLangChainMessages,
  };
});

const aiMessageWithNullToolCall = {
  id: "ai-1",
  type: "ai",
  content: "",
  tool_calls: [null, { id: "tc-1", name: "get_weather", args: {} }],
} as unknown as LangChainMessage;

const wrapperFactory = (runtime: AssistantRuntime) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
  return Wrapper;
};

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: threadId,
    externalId: threadId,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "lg-thread-1",
    externalId: "lg-thread-1",
  })),
});

describe("useLangGraphRuntime with a null tool_calls entry", () => {
  it("resumes the graph with the result of the remaining tool call", async () => {
    const streamMock = vi.fn(async function* (_messages: LangChainMessage[]) {
      if (streamMock.mock.calls.length === 1) {
        yield {
          event: "messages/partial",
          data: [aiMessageWithNullToolCall],
        };
        yield {
          event: "messages/complete",
          data: [{ ...aiMessageWithNullToolCall, content: "checking" }],
        };
      }
    });
    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({ stream: streamMock }),
    );
    const { result: auiResult } = renderHook(() => useAui(), {
      wrapper: wrapperFactory(runtimeResult.current),
    });

    await act(async () => {
      auiResult.current.composer.setText("what's the weather?");
      auiResult.current.composer.send();
    });
    await waitFor(() =>
      expect(
        runtimeResult.current.thread.getState().messages.at(-1)?.content,
      ).toMatchObject([
        { type: "text", text: "checking" },
        { type: "tool-call", toolCallId: "tc-1" },
      ]),
    );

    act(() => {
      runtimeResult.current.thread
        .getMessageById("ai-1")
        .getMessagePartByToolCallId("tc-1")
        .addToolResult({ temperature: 72 });
    });

    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(2));
    expect(streamMock.mock.calls[1]?.[0]).toMatchObject([
      { type: "tool", tool_call_id: "tc-1", status: "success" },
    ]);
  });

  const renderLoadedThread = async (
    history: LangChainMessage[],
    stream: LangGraphStreamCallback<LangChainMessage>,
  ) => {
    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream,
        load: async () => ({ messages: history }),
        getCheckpointId: async () => null,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    const { result: auiResult } = renderHook(() => useAui(), {
      wrapper: wrapperFactory(runtimeResult.current),
    });
    await act(async () => {
      await runtimeResult.current.threads.switchToThread("lg-thread-1");
    });
    await waitFor(() =>
      expect(
        runtimeResult.current.thread.getState().messages.map((m) => m.id),
      ).toEqual(history.filter((m) => m.type !== "tool").map((m) => m.id)),
    );
    return { runtime: runtimeResult.current, aui: auiResult.current };
  };

  const history: LangChainMessage[] = [
    { id: "human-1", type: "human", content: "weather?" },
    aiMessageWithNullToolCall,
  ];

  it("resumes a loaded thread with the result of the remaining tool call", async () => {
    const streamMock = vi.fn(async function* (
      _messages: LangChainMessage[],
    ) {});
    const { runtime } = await renderLoadedThread(history, streamMock);

    act(() => {
      runtime.thread
        .getMessageById("ai-1")
        .getMessagePartByToolCallId("tc-1")
        .addToolResult({ temperature: 72 });
    });

    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
    expect(streamMock.mock.calls[0]?.[0]).toMatchObject([
      { type: "tool", tool_call_id: "tc-1", status: "success" },
    ]);
  });

  it("cancels the remaining pending call of a loaded thread on the next send", async () => {
    const streamMock = vi.fn(async function* (
      _messages: LangChainMessage[],
    ) {});
    const { aui } = await renderLoadedThread(history, streamMock);

    await act(async () => {
      aui.composer.setText("never mind");
      aui.composer.send();
    });

    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
    expect(streamMock.mock.calls[0]?.[0]).toMatchObject([
      { type: "tool", tool_call_id: "tc-1", status: "error" },
      { type: "human", content: "never mind" },
    ]);
  });

  it("edits a later message of a loaded thread", async () => {
    const streamMock = vi.fn(async function* (
      _messages: LangChainMessage[],
    ) {});
    const { aui } = await renderLoadedThread(
      [
        ...history,
        {
          id: "tool-1",
          type: "tool",
          name: "get_weather",
          tool_call_id: "tc-1",
          content: "sunny",
          status: "success",
        },
        { id: "human-2", type: "human", content: "thanks" },
      ],
      streamMock,
    );

    const editComposer = aui.thread().message({ id: "human-2" }).composer();
    await act(async () => {
      editComposer.beginEdit();
      editComposer.setText("thank you");
      await editComposer.send();
    });

    await waitFor(() => expect(streamMock).toHaveBeenCalledTimes(1));
    expect(streamMock.mock.calls[0]?.[0]).toMatchObject([
      { type: "human", content: "thank you" },
    ]);
  });
});
