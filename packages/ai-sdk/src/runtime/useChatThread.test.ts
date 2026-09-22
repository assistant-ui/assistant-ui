// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { resource, useResource, flushTapSync } from "@assistant-ui/tap";
import { useState } from "react";
import {
  RuntimeAdapter,
  runtimeAdapterTransformScopes,
} from "@assistant-ui/core/store";
import {
  attachTransformScopes,
  AuiConfig,
  createAssistantClient,
} from "@assistant-ui/store/client";
import { useChatThread, type ChatThreadEnvironment } from "./useChatThread";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import {
  createResumableSessionStorage,
  RESUMABLE_STREAM_ID_HEADER,
} from "../transport/resumable";
import type { UIMessageChunk } from "ai";
import {
  createCancellableTransport,
  nextTask,
} from "./__tests__/controlled-transport";

const createHost = (
  env: Pick<ChatThreadEnvironment, "stopOnClientDestroy">,
) => {
  const useHost = (options: Parameters<typeof useChatThread>[0]) => {
    const [threadListItem] = useState(() => ({
      initialize: async () => ({ remoteId: "main", externalId: undefined }),
    }));
    const runtime = useChatThread(options, {
      id: "main",
      isMainThread: true,
      getThreadListItem: () => threadListItem,
      ...env,
    });
    return useResource(RuntimeAdapter(runtime));
  };
  attachTransformScopes(useHost, runtimeAdapterTransformScopes);
  return resource(useHost);
};

const streamThenDestroy = async (
  env: Pick<ChatThreadEnvironment, "stopOnClientDestroy">,
) => {
  const { transport, getCancelCount, close } = createCancellableTransport();
  const Host = createHost(env);
  const handle = createAssistantClient(
    AuiConfig({ threads: Host({ transport }) }),
  );
  handle.subscribe(() => {});
  const aui = handle.getClient();

  try {
    flushTapSync(() => aui.composer.setText("stop me"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => {
      expect(aui.thread.getState().isRunning).toBe(true);
    });
  } finally {
    handle.destroy();
  }
  await nextTask();
  const cancelCount = getCancelCount();
  if (cancelCount === 0) close();
  return cancelCount;
};

describe("useChatThread", () => {
  it("resumes a stopped response without sending another message and consumes its checkpoint on finish", async () => {
    const storage = createResumableSessionStorage({ key: "composer-resume" });
    storage.clear();
    let initial!: ReadableStreamDefaultController<Uint8Array>;
    let resumed!: ReadableStreamDefaultController<Uint8Array>;
    const headers = {
      "content-type": "text/event-stream",
      [RESUMABLE_STREAM_ID_HEADER]: "stream-1",
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({ start: (controller) => (initial = controller) }),
          { headers },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({ start: (controller) => (resumed = controller) }),
          { headers },
        ),
      );
    const transport = new AssistantChatTransport({
      fetch,
      resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
    });
    const emit = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      ...chunks: UIMessageChunk[]
    ) => {
      for (const chunk of chunks) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`),
        );
      }
    };
    const Host = createHost({});
    const handle = createAssistantClient(
      AuiConfig({ threads: Host({ transport }) }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    try {
      expect(aui.thread.getState().canResume).toBe(false);
      flushTapSync(() => aui.composer.setText("continue this response"));
      flushTapSync(() => aui.composer.send());
      emit(
        initial,
        { type: "start", messageId: "answer" },
        { type: "text-start", id: "text" },
        { type: "text-delta", id: "text", delta: "Partial" },
      );
      await vi.waitFor(() => {
        expect(aui.thread.getState().messages.at(-1)?.parts[0]).toMatchObject({
          type: "text",
          text: "Partial",
        });
        expect(aui.thread.getState().isRunning).toBe(true);
        expect(aui.thread.getState().canResume).toBe(false);
      });
      flushTapSync(() => aui.thread.cancelRun());
      await vi.waitFor(() =>
        expect(aui.thread.getState().canResume).toBe(true),
      );
      expect(storage.getStreamId("main")).toBe("stream-1");
      expect(fetch).toHaveBeenCalledOnce();

      const pending = aui.thread.resumeRun({ parentId: "answer" });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      expect(fetch.mock.calls[1]?.[0]).toBe("/api/resume/stream-1");
      emit(
        resumed,
        { type: "start", messageId: "answer" },
        { type: "text-start", id: "text" },
        { type: "text-delta", id: "text", delta: "Partial complete" },
        { type: "text-end", id: "text" },
        { type: "finish" },
      );
      resumed.close();
      await pending;
      await vi.waitFor(() => {
        const state = aui.thread.getState();
        expect(state.isRunning).toBe(false);
        expect(state.canResume).toBe(false);
        expect(state.messages).toHaveLength(2);
        expect(state.messages.at(-1)?.id).toBe("answer");
        expect(state.messages.at(-1)?.parts[0]).toMatchObject({
          type: "text",
          text: "Partial complete",
        });
      });
      expect(storage.getStreamId("main")).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      handle.destroy();
      storage.clear();
    }
  });

  it("stops an in-flight chat on client destroy when stopOnClientDestroy is omitted", async () => {
    expect(await streamThenDestroy({})).toBe(1);
  });

  it("leaves an in-flight chat running on client destroy when stopOnClientDestroy is false", async () => {
    expect(await streamThenDestroy({ stopOnClientDestroy: false })).toBe(0);
  });
});
