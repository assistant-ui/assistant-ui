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
import { createCancellableTransport } from "./__tests__/controlled-transport";

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
  await new Promise((resolve) => setTimeout(resolve, 0));
  const cancelCount = getCancelCount();
  if (cancelCount === 0) close();
  return cancelCount;
};

describe("useChatThread", () => {
  it("stops an in-flight chat on client destroy when stopOnClientDestroy is omitted", async () => {
    expect(await streamThenDestroy({})).toBe(1);
  });

  it("leaves an in-flight chat running on client destroy when stopOnClientDestroy is false", async () => {
    expect(await streamThenDestroy({ stopOnClientDestroy: false })).toBe(0);
  });
});
