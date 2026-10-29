// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import type { AssistantCloud } from "assistant-cloud";
import { useAui } from "@assistant-ui/store";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { createStreamHarness } from "./__tests__/controlled-transport";
import { useChatRuntime } from "./useChatRuntime";

const mocks = vi.hoisted(() => {
  const adapters = new Map<object, RemoteThreadListAdapter>();
  const initializers = new Map<object, Array<() => void>>();
  const historyRemoteIds: string[] = [];
  const adapterFor = (cloud: object) => {
    let adapter = adapters.get(cloud);
    if (adapter) return adapter;
    const remoteSuffix = adapters.size;
    adapter = {
      list: async () => ({ threads: [] }),
      initialize: (threadId: string) =>
        new Promise((resolve) => {
          initializers.set(cloud, [
            ...(initializers.get(cloud) ?? []),
            () =>
              resolve({
                remoteId: `${threadId}-${remoteSuffix}`,
                externalId: undefined,
              }),
          ]);
        }),
      rename: async () => {},
      archive: async () => {},
      unarchive: async () => {},
      delete: async () => {},
      generateTitle: async () => new ReadableStream() as never,
      fetch: async (id: string) => ({
        status: "regular" as const,
        remoteId: id,
        externalId: undefined,
        title: id,
      }),
      unstable_useAdapters: useCloudHistory,
    };
    adapters.set(cloud, adapter);
    return adapter;
  };
  return {
    initializers,
    historyRemoteIds,
    useCloudThreadListAdapter: vi.fn(({ cloud }: { cloud: object }) =>
      adapterFor(cloud),
    ),
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
}));

// Cloud history appends initialize the thread too, so a send has two callers.
function useCloudHistory() {
  const aui = useAui();
  const history = {
    load: async () => ({ messages: [] }),
    append: async () => {},
    withFormat: () => ({
      load: async () => ({ messages: [] }),
      append: async () => {
        const { remoteId } = await aui.threadListItem().initialize();
        mocks.historyRemoteIds.push(remoteId);
      },
      delete: async () => {},
      reportTelemetry: () => {},
    }),
  };
  return { history };
}

const resolveInitializers = (cloud: object) => {
  for (const resolve of mocks.initializers.get(cloud)!) resolve();
};

const sse = (...chunks: object[]) =>
  new Response(
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
      "data: [DONE]\n\n",
    { headers: { "content-type": "text/event-stream" } },
  );

describe("useChatRuntime cloud swap", () => {
  it("sends a pending first message through the replacement cloud", async () => {
    const anonymous = {} as AssistantCloud;
    const account = {} as AssistantCloud;
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        sse(
          { type: "start" },
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: "hi" },
          { type: "text-end", id: "t" },
          { type: "finish" },
        ),
    );
    const { Probe, send, client } = createStreamHarness();
    let setCloud!: (cloud: AssistantCloud) => void;
    const App = () => {
      const [cloud, set] = useState(anonymous);
      setCloud = set;
      const [transport] = useState(
        () => new AssistantChatTransport({ api: "/api/chat", fetch }),
      );
      const runtime = useChatRuntime({ cloud, transport });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Probe />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await act(async () => send());
    await waitFor(() => expect(mocks.initializers.has(anonymous)).toBe(true));

    await act(async () => setCloud(account));
    await act(async () => resolveInitializers(anonymous));
    await waitFor(() => expect(mocks.initializers.has(account)).toBe(true));
    await act(async () => resolveInitializers(account));

    await waitFor(() =>
      expect(client().thread.getState().isRunning).toBe(false),
    );
    const [, init] = fetch.mock.calls[0]!;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(init!.body)).id).toMatch(/-1$/);
    await waitFor(() =>
      expect(mocks.historyRemoteIds.length).toBeGreaterThan(0),
    );
    expect(mocks.historyRemoteIds.every((id) => id.endsWith("-1"))).toBe(true);
    const reply = client().thread.getState().messages.at(-1)!;
    expect(reply.status?.type).toBe("complete");
    expect(reply.content).toMatchObject([{ type: "text", text: "hi" }]);
  });
});
