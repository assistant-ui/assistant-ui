import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type {
  AssistantRuntime,
  AttachmentAdapter,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import { useAui } from "@assistant-ui/store";
import { useLangGraphRuntime, useLangGraphSend } from "./useLangGraphRuntime";
import { mockStreamCallbackFactory } from "./testUtils";
import type { ReactNode } from "react";

const metadataEvent = {
  event: "metadata",
  data: {
    thread_id: "123",
    run_attempt: 1,
  },
};

const infoEvent = {
  event: "info",
  data: {
    message: "Processing request",
  },
};

const errorEvent = {
  event: "error",
  data: {
    message: "Something went wrong",
  },
};

const customEvent = {
  event: "custom",
  data: {
    type: "test",
    value: "custom data",
  },
};

describe("useLangGraphRuntime", () => {
  const wrapperFactory = (runtime: AssistantRuntime) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
    Wrapper.displayName = "TestWrapper";
    return Wrapper;
  };

  it("should handle metadata events", async () => {
    const onMetadata = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([metadataEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onMetadata,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const {
      result: { current: sendResult },
    } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait two ticks for the runtime to be fully mounted
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    act(() => {
      sendResult(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onMetadata).toHaveBeenCalledWith(metadataEvent.data);
    });
  });

  it("should handle info events", async () => {
    const onInfo = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([infoEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onInfo,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onInfo).toHaveBeenCalledWith(infoEvent.data);
    });
  });

  it("should handle error events", async () => {
    const onError = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([errorEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onError,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(errorEvent.data);
    });
  });

  it("should handle custom events", async () => {
    const onCustomEvent = vi.fn();

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([customEvent])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {
            onCustomEvent,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
      expect(onCustomEvent).toHaveBeenCalledWith(
        customEvent.event,
        customEvent.data,
      );
    });
  });

  it("should work without any provided callbacks", async () => {
    const streamMock = vi
      .fn()
      .mockImplementation(() =>
        mockStreamCallbackFactory([
          metadataEvent,
          infoEvent,
          errorEvent,
          customEvent,
        ])(),
      );

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          eventHandlers: {},
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: sendResult } = renderHook(() => useLangGraphSend(), {
      wrapper,
    });

    // Wait a tick for the runtime to be fully mounted
    await waitFor(() => {
      expect(sendResult.current).toBeDefined();
    });

    act(() => {
      sendResult.current(
        [
          {
            type: "human",
            content: "Hello, world!",
          },
        ],
        {},
      );
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalled();
    });

    // Should not throw any errors even when events are processed without handlers
    expect(runtimeResult.current).toBeDefined();
  });

  it("serializes attachment file content in flat LangGraph format", async () => {
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const attachmentAdapter: AttachmentAdapter = {
      accept: "application/pdf",
      add: async ({ file }) => ({
        id: "pending-file-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send: async (attachment) => ({
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            filename: attachment.name,
            data: "ZmFrZS1wZGY=",
            mimeType: attachment.contentType ?? "application/pdf",
          },
        ],
      }),
    };

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          adapters: {
            attachments: attachmentAdapter,
          },
        }),
      {},
    );

    const wrapper = wrapperFactory(runtimeResult.current);
    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await act(async () => {
      await auiResult.current
        .composer()
        .addAttachment(
          new File(["fake-pdf"], "document.pdf", { type: "application/pdf" }),
        );
      await auiResult.current.composer().send();
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    const sentMessages = streamMock.mock.calls[0]?.[0];
    expect(sentMessages).toMatchObject([
      {
        type: "human",
        content: [
          { type: "text", text: " " },
          {
            type: "file",
            data: "ZmFrZS1wZGY=",
            mime_type: "application/pdf",
            metadata: { filename: "document.pdf" },
            source_type: "base64",
          },
        ],
      },
    ]);
    expect(sentMessages?.[0]?.content?.[1]).not.toHaveProperty("file");
  });

  it("should use unstable_threadListAdapter in place of the cloud adapter", async () => {
    const list = vi.fn(async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: "lg-thread-1",
          externalId: "lg-thread-1",
          title: "Existing LangGraph thread",
        },
      ],
    }));
    const adapter: RemoteThreadListAdapter = {
      list,
      initialize: vi.fn(async () => ({
        remoteId: "lg-thread-1",
        externalId: "lg-thread-1",
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
    };

    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    renderHook(() =>
      useLangGraphRuntime({
        stream: streamMock,
        unstable_threadListAdapter: adapter,
      }),
    );

    await waitFor(() => {
      expect(list).toHaveBeenCalled();
    });
  });
});
