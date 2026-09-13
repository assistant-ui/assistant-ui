// @vitest-environment jsdom

import { describe, expect, it, onTestFinished, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import type { PendingAttachment } from "../../../types/attachment";
import {
  createCloudThreadListAdapter,
  getCloudThreadOwnership,
} from "./createCloudThreadListAdapter";
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
    files: {
      generatePresignedUploadUrl: vi.fn(async () => ({
        signedUrl: "https://storage.example/upload",
        publicUrl: "https://cdn.example/file.png",
      })),
    },
    registerSdk: vi.fn(),
  }) as unknown as AssistantCloud;

const makeThread = (id: string) => ({
  id,
  title: id,
  is_archived: false,
  external_id: null,
  metadata: null,
  last_message_at: new Date(0),
  created_at: new Date(0),
  updated_at: new Date(0),
  project_id: "project-1",
  workspace_id: "workspace-1",
});

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

  it("records remote ids listed by a scoped adapter", async () => {
    const cloud = makeCloud();
    vi.mocked(cloud.threads.list)
      .mockResolvedValueOnce({ threads: [makeThread("remote-1")] })
      .mockResolvedValueOnce({ threads: [] });
    const adapter = createCloudThreadListAdapter({
      cloud,
      scopeId: "workspace-a",
    });
    const ownership = getCloudThreadOwnership(adapter)!;

    expect(ownership.has("remote-1")).toBe(false);
    await adapter.list();
    expect(ownership.has("remote-1")).toBe(true);
  });

  it("does not transfer explicit ownership into the default scope", async () => {
    const cloud = makeCloud();
    vi.mocked(cloud.threads.list)
      .mockResolvedValueOnce({ threads: [makeThread("explicit-only")] })
      .mockResolvedValueOnce({ threads: [] });
    const scoped = createCloudThreadListAdapter({
      cloud,
      scopeId: "workspace-a",
    });
    await scoped.list();

    const unscoped = createCloudThreadListAdapter({ cloud });

    expect(getCloudThreadOwnership(scoped)!.has("explicit-only")).toBe(true);
    expect(getCloudThreadOwnership(unscoped)!.has("explicit-only")).toBe(false);
  });

  it("releases ownership after deleting a thread", async () => {
    const cloud = makeCloud();
    vi.mocked(cloud.threads.create).mockResolvedValueOnce({
      thread_id: "remote-1",
    });
    const adapter = createCloudThreadListAdapter({
      cloud,
      scopeId: "workspace-a",
    });
    const ownership = getCloudThreadOwnership(adapter)!;
    await adapter.initialize();

    expect(ownership.has("remote-1")).toBe(true);
    await adapter.delete!("remote-1");
    expect(ownership.has("remote-1")).toBe(false);
  });

  it("registers core and the calling integration identities", () => {
    const cloud = makeCloud();
    const sdk = { name: "@assistant-ui/ai-sdk", version: "0.0.5" };

    createCloudThreadListAdapter({ cloud, sdk });

    expect(cloud.registerSdk).toHaveBeenNthCalledWith(1, CORE_SDK);
    expect(cloud.registerSdk).toHaveBeenNthCalledWith(2, sdk);
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

  it("captures Cloud and scope with the standalone adapter", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    onTestFinished(() => vi.unstubAllGlobals());
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    const options = { cloud: firstCloud, scopeId: "workspace-a" };
    const adapter = createCloudThreadListAdapter(() => options);
    const { result, rerender } = renderHook(() =>
      adapter.unstable_useAdapters!(),
    );
    const attachments = result.current!.attachments!;
    const file = new File([new Uint8Array([1, 2, 3])], "pixel.png", {
      type: "image/png",
    });
    let ready: PendingAttachment | undefined;
    for await (const attachment of attachments.add({ file })) {
      ready = attachment;
    }

    options.cloud = secondCloud;
    options.scopeId = "workspace-b";
    rerender();

    await expect(attachments.send(ready!)).resolves.toMatchObject({
      status: { type: "complete" },
    });
    expect(firstCloud.files.generatePresignedUploadUrl).toHaveBeenCalledOnce();
    expect(secondCloud.files.generatePresignedUploadUrl).not.toHaveBeenCalled();
  });
});
