import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  type AttachmentAdapter,
  AssistantRuntime,
  AssistantRuntimeProvider,
  useAui,
} from "@assistant-ui/react";
import { useLangGraphRuntime, useLangGraphSend } from "./useLangGraphRuntime";
import { mockStreamCallbackFactory } from "./testUtils";
import { ReactNode } from "react";

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

  it("sends one stream request for attachment-only composer message", async () => {
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const attachmentAdapter: AttachmentAdapter = {
      accept: "application/pdf",
      add: vi.fn().mockImplementation(async ({ file }) => ({
        id: "att-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      })),
      remove: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockImplementation(async (attachment) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          ...attachment,
          status: { type: "complete" },
          content: [
            {
              type: "file",
              filename: attachment.name,
              data: "ZmFrZS1iYXNlNjQ=",
              mimeType: attachment.contentType ?? "application/pdf",
            },
          ],
        };
      }),
    };

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
          adapters: { attachments: attachmentAdapter },
        }),
      {},
    );
    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    await act(async () => {
      await auiResult.current
        .composer()
        .addAttachment(
          new File(["fake pdf bytes"], "example.pdf", {
            type: "application/pdf",
          }),
        );
    });

    act(() => {
      auiResult.current.composer().send();
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(attachmentAdapter.send).toHaveBeenCalledTimes(1);
    expect(
      auiResult.current
        .thread()
        .getState()
        .messages.filter((m) => m.role === "user"),
    ).toHaveLength(1);

    const [messages] = streamMock.mock.calls[0]!;
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("human");
    expect(messages[0]!.content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        file: {
          filename: "example.pdf",
          file_data: "ZmFrZS1iYXNlNjQ=",
          mime_type: "application/pdf",
        },
      },
    ]);
  });

  it("injects text part for file-only thread append", async () => {
    const streamMock = vi
      .fn()
      .mockImplementation(() => mockStreamCallbackFactory([])());

    const { result: runtimeResult } = renderHook(
      () =>
        useLangGraphRuntime({
          stream: streamMock,
        }),
      {},
    );
    const wrapper = wrapperFactory(runtimeResult.current);

    const { result: auiResult } = renderHook(() => useAui(), { wrapper });

    act(() => {
      auiResult.current.thread().append({
        role: "user",
        content: [],
        attachments: [
          {
            id: "att-1",
            type: "document",
            name: "example.pdf",
            contentType: "application/pdf",
            status: { type: "complete" },
            content: [
              {
                type: "file",
                filename: "example.pdf",
                data: "ZmFrZS1iYXNlNjQ=",
                mimeType: "application/pdf",
              },
            ],
          },
        ],
      });
    });

    await waitFor(() => {
      expect(streamMock).toHaveBeenCalledTimes(1);
    });

    const [messages] = streamMock.mock.calls[0]!;
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe("human");
    expect(messages[0]!.content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        file: {
          filename: "example.pdf",
          file_data: "ZmFrZS1iYXNlNjQ=",
          mime_type: "application/pdf",
        },
      },
    ]);
  });
});
