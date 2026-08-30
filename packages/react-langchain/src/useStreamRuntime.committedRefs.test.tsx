// @vitest-environment jsdom

import { act, render, renderHook } from "@testing-library/react";
import { startTransition, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import type { LangChainBaseMessage } from "./types";

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

const createMockStream = (messages: LangChainBaseMessage[] = []) => ({
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
    messageMetadataStore: { getSnapshot: vi.fn() },
  },
});

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
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

describe("useStreamRuntime committed refs", () => {
  it("submits through the committed stream after an abandoned render", async () => {
    const streamA = createMockStream();
    const streamB = createMockStream();
    const adapter = makeThreadListAdapter();

    mockUseStream.mockImplementation((options: { apiUrl: string }) =>
      options.apiUrl === "/api/b" ? streamB : streamA,
    );
    const host = renderHook(() =>
      useStreamRuntime({
        apiUrl: "/api/a",
        unstable_threadListAdapter: adapter,
      } as never),
    );

    const pending = new Promise<never>(() => {});
    let blocked = false;
    const interruptedRender = vi.fn();
    const Blocker = () => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };

    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Nested = ({ apiUrl }: { apiUrl: string }) => {
      capture.runtime = useStreamRuntime({
        apiUrl,
        unstable_threadListAdapter: adapter,
      } as never);
      return null;
    };
    const Tree = ({ apiUrl }: { apiUrl: string }) => (
      <AssistantRuntimeProvider runtime={host.result.current}>
        <Suspense fallback={null}>
          <Nested apiUrl={apiUrl} />
          <Blocker />
        </Suspense>
      </AssistantRuntimeProvider>
    );

    const view = render(<Tree apiUrl="/api/a" />);
    expect(capture.runtime).not.toBeNull();

    act(() => {
      blocked = true;
      startTransition(() => view.rerender(<Tree apiUrl="/api/b" />));
    });
    expect(interruptedRender).toHaveBeenCalled();

    await act(async () => {
      await capture.runtime!.thread.append("hello");
    });

    expect(streamA.submit).toHaveBeenCalledOnce();
    expect(streamB.submit).not.toHaveBeenCalled();

    await act(async () => {
      blocked = false;
      view.rerender(<Tree apiUrl="/api/b" />);
    });
    await act(async () => {
      await capture.runtime!.thread.append("second");
    });

    expect(streamB.submit).toHaveBeenCalledOnce();
    view.unmount();
    host.unmount();
  });
});
