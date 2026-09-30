// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { resource, useResource, flushTapSync } from "@assistant-ui/tap";
import { useState } from "react";
import type { ChatTransport, UIMessage } from "ai";
import {
  RuntimeAdapter,
  runtimeAdapterTransformScopes,
} from "@assistant-ui/core/store";
import {
  attachTransformScopes,
  AuiConfig,
  createAssistantClient,
} from "@assistant-ui/store/client";
import {
  createChat,
  useChatThread,
  type ChatThreadEnvironment,
} from "./useChatThread";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { createResumableSessionStorage } from "../transport/resumable";
import {
  createCancellableTransport,
  nextTask,
} from "./__tests__/controlled-transport";

const createHost = (
  env: Pick<ChatThreadEnvironment, "stopOnClientDestroy" | "chat">,
  onRuntime?: (runtime: ReturnType<typeof useChatThread>) => void,
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
    onRuntime?.(runtime);
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
  it.each([
    { adapters: undefined, threadId: "main" },
    {
      adapters: { threadList: { threadId: "caller-id" } },
      threadId: "caller-id",
    },
  ])("uses $threadId as the runtime thread id", ({ adapters, threadId }) => {
    let runtime: ReturnType<typeof useChatThread> | undefined;
    const Host = createHost({}, (value) => {
      runtime = value;
    });
    const handle = createAssistantClient(
      AuiConfig({ threads: Host({ adapters }) }),
    );
    try {
      handle.subscribe(() => {});
      expect(runtime?.thread.getState().threadId).toBe(threadId);
    } finally {
      handle.destroy();
    }
  });

  it.each(["send", "resume"])(
    "ignores errors from a subsequent %s when a resume finishes",
    async (nextRequest) => {
      const storage = createResumableSessionStorage({
        key: `resume-${nextRequest}-race`,
      });
      storage.setStreamId("stream-1", "main");
      const error = new Error(`${nextRequest} offline`);
      const onError = vi.fn();
      const onResumeError = vi.fn();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const transport = {
        getResumableAdapter: () => ({ storage }),
        reconnectToStream: vi
          .fn<ChatTransport<UIMessage>["reconnectToStream"]>()
          .mockRejectedValue(error)
          .mockImplementationOnce(
            async () =>
              new ReadableStream({
                start(controller) {
                  controller.enqueue({ type: "start", messageId: "resumed" });
                  controller.close();
                },
              }),
          ),
        sendMessages: vi.fn(async () => {
          throw error;
        }),
      } satisfies ChatTransport<UIMessage> & {
        getResumableAdapter: () => { storage: typeof storage };
      };
      let sent = false;
      const callbacks = {
        onError,
        onFinish: () => {
          if (!sent) {
            sent = true;
            if (nextRequest === "resume") {
              void chat.resumeStream();
            } else {
              void chat.sendMessage({
                role: "user",
                parts: [{ type: "text", text: "next" }],
              });
            }
          }
        },
      };
      const chat = createChat(
        {
          id: "main",
          transport,
        },
        { current: callbacks },
      );
      const Host = createHost({ chat });
      const handle = createAssistantClient(
        AuiConfig({ threads: Host({ transport, onResumeError }) }),
      );
      handle.subscribe(() => {});
      try {
        await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error));
        await nextTask();
        expect(onResumeError).not.toHaveBeenCalled();
        expect(storage.getStreamId("main")).toBe("stream-1");
      } finally {
        handle.destroy();
        storage.clear();
        warn.mockRestore();
      }
    },
  );

  it.each([false, true])(
    "reports SDK reconnect failures and preserves replacement checkpoints: %s",
    async (replaceCheckpoint) => {
      const storage = createResumableSessionStorage({
        key: `automatic-resume-error-${replaceCheckpoint}`,
      });
      storage.setStreamId("failed-stream", "main");
      const error = new Error("resume offline");
      const onError = vi.fn();
      const onResumeError = vi.fn(() => {
        if (replaceCheckpoint) storage.setStreamId("replacement", "main");
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let finishReplacement: (() => void) | undefined;
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValueOnce(error)
        .mockImplementation(
          () =>
            new Promise<Response>((resolve) => {
              finishReplacement = () =>
                resolve(new Response(null, { status: 204 }));
            }),
        );
      const Host = createHost({});
      const handle = createAssistantClient(
        AuiConfig({
          threads: Host({
            transport: new AssistantChatTransport({
              fetch,
              resumable: { storage, resumeApi: (id) => `/api/resume/${id}` },
            }),
            onError,
            onResumeError,
          }),
        }),
      );
      handle.subscribe(() => {});
      try {
        await vi.waitFor(() => {
          expect(onError).toHaveBeenCalledWith(error);
          expect(onResumeError).toHaveBeenCalledOnce();
        });
        expect(onResumeError).toHaveBeenCalledWith(error);
        expect(warn).toHaveBeenCalledWith(
          "[assistant-ui] resumable: resume failed",
          error,
        );
        expect(storage.getStreamId("main")).toBe(
          replaceCheckpoint ? "replacement" : null,
        );
      } finally {
        handle.destroy();
        finishReplacement?.();
        storage.clear();
        warn.mockRestore();
      }
    },
  );

  it("stops an in-flight chat on client destroy when stopOnClientDestroy is omitted", async () => {
    expect(await streamThenDestroy({})).toBe(1);
  });

  it("leaves an in-flight chat running on client destroy when stopOnClientDestroy is false", async () => {
    expect(await streamThenDestroy({ stopOnClientDestroy: false })).toBe(0);
  });
});
