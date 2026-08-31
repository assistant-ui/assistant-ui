// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { createCloudThreadListAdapter } from "./createCloudThreadListAdapter";

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
