import { act, renderHook, waitFor } from "@testing-library/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LangChainMessage, UIMessage } from "./types";

const { conversionSpy } = vi.hoisted(() => ({ conversionSpy: vi.fn() }));

vi.mock("./convertLangChainMessages", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./convertLangChainMessages")>();
  return {
    ...original,
    convertLangChainMessages: (
      ...args: Parameters<typeof original.convertLangChainMessages>
    ) => {
      conversionSpy(args[0].id);
      return original.convertLangChainMessages(...args);
    },
  };
});

import { useLangGraphRuntime } from "./useLangGraphRuntime";

const MESSAGE_COUNT = 1_000;
const messages: LangChainMessage[] = Array.from(
  { length: MESSAGE_COUNT },
  (_, index) =>
    index % 2 === 0
      ? { type: "human", id: `message-${index}`, content: `Message ${index}` }
      : { type: "ai", id: `message-${index}`, content: `Message ${index}` },
);

const parentId = `message-${MESSAGE_COUNT - 1}`;
const parentUI: UIMessage = {
  type: "ui",
  id: "ui-1",
  name: "chart",
  props: { value: 1 },
  metadata: { message_id: parentId },
};

const makeThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-1",
        externalId: "thread-1",
        title: "Thread",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
});

const wrapperFactory = (runtime: AssistantRuntime) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("useLangGraphRuntime metadata cache", () => {
  it("re-converts only the parent when a UI snapshot changes", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ messages })
      .mockResolvedValueOnce({ messages, uiMessages: [parentUI] });
    const stream = vi.fn(async function* () {});
    const { result: runtimeResult } = renderHook(() =>
      useLangGraphRuntime({
        stream,
        load,
        unstable_threadListAdapter: makeThreadListAdapter(),
      }),
    );
    renderHook(() => runtimeResult.current.thread.getState(), {
      wrapper: wrapperFactory(runtimeResult.current),
    });

    await act(async () => {
      await runtimeResult.current.threads.switchToThread("thread-1");
    });
    await waitFor(() =>
      expect(runtimeResult.current.thread.getState().messages).toHaveLength(
        MESSAGE_COUNT,
      ),
    );
    expect(conversionSpy).toHaveBeenCalledTimes(MESSAGE_COUNT);
    conversionSpy.mockClear();

    await act(async () => {
      await runtimeResult.current.threads.reloadMainThread();
    });

    expect(conversionSpy).toHaveBeenCalledOnce();
    expect(conversionSpy).toHaveBeenCalledWith(parentId);
    expect(
      runtimeResult.current.thread.getState().messages.at(-1)?.content.at(-1),
    ).toMatchObject({
      type: "data",
      name: "chart",
      data: { value: 1 },
    });
  });
});
