// @vitest-environment jsdom

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";
import type { LangChainBaseMessage } from "./types";
import type { ReactNode } from "react";

const { mockUseChannel, mockUseStream, streamController } = vi.hoisted(() => ({
  mockUseChannel: vi.fn(() => []),
  mockUseStream: vi.fn(),
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", () => ({
  STREAM_CONTROLLER: streamController,
  useChannel: mockUseChannel,
  useStream: mockUseStream,
}));

import { useStreamRuntime } from "./useStreamRuntime";

type MockStream = {
  messages: LangChainBaseMessage[];
  isLoading: boolean;
  isThreadLoading: boolean;
  values: Record<string, unknown>;
  interrupts: unknown[];
  toolCalls: unknown[];
  subagents: unknown[];
  subgraphs: unknown[];
  error: unknown;
  submit: ReturnType<typeof vi.fn>;
  respond: ReturnType<typeof vi.fn>;
  respondAll: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  client: Record<string, unknown>;
  [streamController]: {
    messageMetadataStore: {
      getSnapshot: ReturnType<typeof vi.fn>;
    };
  };
};

const message = (
  id: string,
  type: "human" | "ai",
  content: string,
): LangChainBaseMessage & { id: string } => ({
  id,
  _getType: () => type,
  content,
});

const createMockStream = (
  messages: LangChainBaseMessage[] = [],
): MockStream => ({
  messages,
  isLoading: false,
  isThreadLoading: false,
  values: {},
  interrupts: [],
  toolCalls: [],
  subagents: [],
  subgraphs: [],
  error: undefined,
  submit: vi.fn(async () => {}),
  respond: vi.fn(),
  respondAll: vi.fn(),
  interrupt: vi.fn(),
  stop: vi.fn(),
  client: {},
  [streamController]: {
    messageMetadataStore: {
      getSnapshot: vi.fn(),
    },
  },
});

const renderRuntime = (stream: MockStream) => {
  mockUseStream.mockReturnValue(stream);
  return renderHook(() => useStreamRuntime({ apiUrl: "/api" } as never));
};

const renderAui = (stream: MockStream) => {
  const runtimeHook = renderRuntime(stream);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtimeHook.result.current}>
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "TestWrapper";
  const auiHook = renderHook(() => useAui(), { wrapper: Wrapper });
  return {
    auiResult: auiHook.result,
    rerender: () => {
      runtimeHook.rerender();
      auiHook.rerender();
    },
  };
};

const getText = (aui: ReturnType<typeof useAui>) =>
  aui.thread.getState().messages.map((m) =>
    m.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
  );

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-a",
        externalId: "thread-a",
        title: "Thread A",
      },
      {
        status: "regular" as const,
        remoteId: "thread-b",
        externalId: "thread-b",
        title: "Thread B",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-new",
    externalId: "thread-new",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async (threadId) => ({
    status: "regular" as const,
    remoteId: threadId,
    externalId: threadId,
  })),
});

describe("useStreamRuntime thread options", () => {
  it("keeps stream options isolated between mounted threads", async () => {
    mockUseStream.mockReturnValue(createMockStream());
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const threadListAdapter = makeThreadListAdapter();

    const TestRuntime = () => {
      const runtime = useStreamRuntime({
        apiUrl: "/api",
        unstable_threadListAdapter: threadListAdapter,
      } as never);
      capture.runtime = runtime;
      return <AssistantRuntimeProvider runtime={runtime} />;
    };

    const view = render(<TestRuntime />);

    await act(async () => {
      await capture.runtime!.threads.switchToThread("thread-a");
    });

    const threadAOptions = mockUseStream.mock.calls
      .map(([options]) => options as { threadId?: string | null })
      .findLast((options) => options.threadId === "thread-a");
    expect(threadAOptions).toBeDefined();

    await act(async () => {
      await capture.runtime!.threads.switchToThread("thread-b");
    });

    const threadBOptions = mockUseStream.mock.calls
      .map(([options]) => options as { threadId?: string | null })
      .findLast((options) => options.threadId === "thread-b");
    expect(threadBOptions).toBeDefined();
    expect(threadAOptions).not.toBe(threadBOptions);
    expect(threadAOptions?.threadId).toBe("thread-a");

    view.unmount();
  });
});

describe("useStreamRuntime staged messages", () => {
  it("stages a new user message without submitting when startRun is false", async () => {
    const stream = createMockStream([message("u1", "human", "earlier")]);
    const { auiResult } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "draft" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["earlier", "draft"]);
    });
    expect(stream.submit).not.toHaveBeenCalled();
  });

  it("keeps a staged edit truncated when stream messages update before promotion", async () => {
    const stream = createMockStream([
      message("u1", "human", "first"),
      message("a1", "ai", "first answer"),
      message("u2", "human", "second"),
    ]);
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        parentId: "u1",
        content: [{ type: "text", text: "edited" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["first", "edited"]);
    });

    stream.messages = [
      message("u1", "human", "first"),
      message("a1", "ai", "first answer from refresh"),
      message("u2", "human", "second from refresh"),
    ];
    rerender();

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual(["first", "edited"]);
    });
    expect(stream.submit).not.toHaveBeenCalled();
  });

  it("keeps later staged messages visible after promoting one staged parent", async () => {
    const stream = createMockStream([message("u1", "human", "earlier")]);
    const { auiResult, rerender } = renderAui(stream);

    await act(async () => {
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "first staged" }],
        startRun: false,
      });
      auiResult.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "second staged" }],
        startRun: false,
      });
    });

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual([
        "earlier",
        "first staged",
        "second staged",
      ]);
    });

    const firstStagedId = auiResult.current.thread.getState().messages[1]!.id;
    await act(async () => {
      await auiResult.current.thread.startRun({
        parentId: firstStagedId,
        sourceId: null,
        runConfig: {},
      });
    });

    expect(stream.submit).toHaveBeenCalledWith(
      {
        messages: [
          expect.objectContaining({
            id: firstStagedId,
            type: "human",
            content: "first staged",
          }),
        ],
      },
      undefined,
    );

    stream.messages = [
      message("u1", "human", "earlier"),
      message(firstStagedId, "human", "first staged"),
      message("a1", "ai", "answer"),
    ];
    rerender();

    await waitFor(() => {
      expect(getText(auiResult.current)).toEqual([
        "earlier",
        "first staged",
        "answer",
        "second staged",
      ]);
    });
  });
});
