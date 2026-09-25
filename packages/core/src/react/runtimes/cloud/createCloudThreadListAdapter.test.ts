// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { createCloudThreadListAdapter } from "./createCloudThreadListAdapter";
import { CORE_SDK } from "./sdkIdentity";

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    threads: {
      getState: () => ({ mainThreadId: "local-1", threadItems: [] }),
    },
    thread: { getState: () => ({ isEmpty: true, suggestions: [] }) },
    threadListItem: {
      getState: () => ({ id: "local-1", remoteId: "remote-1" }),
    },
    on: () => () => {},
    subscribe: () => () => {},
  }),
}));

const makeCloud = () =>
  ({
    threads: {
      list: vi.fn(async () => ({ threads: [] })),
      create: vi.fn(async () => ({ thread_id: "remote-1" })),
      update: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      get: vi.fn(),
    },
    runs: { stream: vi.fn(async () => new ReadableStream()) },
    registerSdk: vi.fn(),
  }) as unknown as AssistantCloud;

describe("createCloudThreadListAdapter", () => {
  it("falls back to an in-memory list without a cloud instance", async () => {
    const create = vi.fn(async () => ({ externalId: "ext-1" }));
    const adapter = createCloudThreadListAdapter({ create });
    expect(await adapter.list()).toEqual({ threads: [] });
    expect(await adapter.initialize("local-1")).toEqual({
      remoteId: "local-1",
      externalId: "ext-1",
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it("maps the cloud api and reads callbacks through the getter", async () => {
    const cloud = makeCloud();
    const options: {
      cloud: AssistantCloud;
      delete?: (threadId: string) => Promise<void>;
    } = { cloud };
    const adapter = createCloudThreadListAdapter(() => options);

    await adapter.list();
    expect(cloud.threads.list).toHaveBeenCalledTimes(2);

    expect(await adapter.initialize("local-1")).toEqual({
      remoteId: "remote-1",
      externalId: undefined,
    });
    expect(cloud.threads.create).toHaveBeenCalledWith({
      last_message_at: expect.any(Date),
      external_id: undefined,
    });

    await adapter.rename("remote-1", "Renamed");
    expect(cloud.threads.update).toHaveBeenCalledWith("remote-1", {
      title: "Renamed",
    });
    await adapter.archive("remote-1");
    expect(cloud.threads.update).toHaveBeenCalledWith("remote-1", {
      is_archived: true,
    });
    await adapter.unarchive("remote-1");
    expect(cloud.threads.update).toHaveBeenCalledWith("remote-1", {
      is_archived: false,
    });

    const onDelete = vi.fn(async () => {});
    options.delete = onDelete;
    await adapter.delete("remote-1");
    expect(onDelete).toHaveBeenCalledWith("remote-1");
    expect(cloud.threads.delete).toHaveBeenCalledWith("remote-1");

    expect(adapter.unstable_useAdapters).toBeTypeOf("function");
    expect(adapter.unstable_Provider).toBeUndefined();
  });

  it("registers core and the calling integration identities", () => {
    const cloud = makeCloud();
    const sdk = { name: "@assistant-ui/ai-sdk", version: "0.0.5" };

    createCloudThreadListAdapter({ cloud, sdk });

    expect(cloud.registerSdk).toHaveBeenNthCalledWith(1, CORE_SDK);
    expect(cloud.registerSdk).toHaveBeenNthCalledWith(2, sdk);
  });

  it("reuses a cloud thread after a committed create loses its response", async () => {
    const stored: Array<{ id: string; externalId: string | undefined }> = [];
    let nextId = 0;
    let loseFirstResponse = true;
    const cloud = {
      threads: {
        create: vi.fn(
          async (body: { external_id?: string; upsert?: boolean }) => {
            const existing = stored.find(
              (thread) => thread.externalId === body.external_id,
            );
            if (body.upsert && existing) return { thread_id: existing.id };
            const thread = {
              id: `remote-${++nextId}`,
              externalId: body.external_id,
            };
            stored.push(thread);
            if (loseFirstResponse) {
              loseFirstResponse = false;
              throw new Error("response lost after commit");
            }
            return { thread_id: thread.id };
          },
        ),
      },
    } as unknown as AssistantCloud;
    const adapter = createCloudThreadListAdapter({
      cloud,
      upsert: true,
      create: async () => ({ externalId: "session-1" }),
    });

    await expect(adapter.initialize("local-1")).rejects.toThrow(
      "response lost after commit",
    );
    await expect(adapter.initialize("local-1")).resolves.toEqual({
      remoteId: "remote-1",
      externalId: "session-1",
    });

    expect(stored).toEqual([{ id: "remote-1", externalId: "session-1" }]);
    expect(cloud.threads.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ external_id: "session-1", upsert: true }),
    );
    expect(cloud.threads.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ external_id: "session-1", upsert: true }),
    );
  });

  it("omits upsert when no external id is available", async () => {
    const cloud = makeCloud();
    const adapter = createCloudThreadListAdapter({ cloud, upsert: true });

    await adapter.initialize("local-1");

    expect(cloud.threads.create).toHaveBeenCalledWith({
      last_message_at: expect.any(Date),
      external_id: undefined,
    });
  });

  it("leaves repeated external ids non-idempotent by default", async () => {
    const cloud = makeCloud();
    const adapter = createCloudThreadListAdapter({
      cloud,
      create: async () => ({ externalId: "session-1" }),
    });

    await adapter.initialize("local-1");
    await adapter.initialize("local-2");

    expect(cloud.threads.create).toHaveBeenCalledTimes(2);
    expect(cloud.threads.create).toHaveBeenNthCalledWith(1, {
      last_message_at: expect.any(Date),
      external_id: "session-1",
    });
    expect(cloud.threads.create).toHaveBeenNthCalledWith(2, {
      last_message_at: expect.any(Date),
      external_id: "session-1",
    });
  });

  it("registers only core without a calling integration identity", () => {
    const cloud = makeCloud();

    createCloudThreadListAdapter({ cloud });

    expect(cloud.registerSdk).toHaveBeenCalledOnce();
    expect(cloud.registerSdk).toHaveBeenCalledWith(CORE_SDK);
  });

  it("constructs stable history and attachment adapters when the hook runs", () => {
    const cloud = makeCloud();
    const adapter = createCloudThreadListAdapter({ cloud });
    const { result, rerender } = renderHook(() =>
      adapter.unstable_useAdapters!(),
    );
    const first = result.current!;
    expect(first.history).toBeDefined();
    expect((first.history as { withFormat?: unknown }).withFormat).toBeTypeOf(
      "function",
    );
    expect(first.attachments).toBeDefined();

    rerender();
    expect(result.current!.history).toBe(first.history);
    expect(result.current!.attachments).toBe(first.attachments);
  });
});
