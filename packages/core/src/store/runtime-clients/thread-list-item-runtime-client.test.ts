import {
  AuiConfig,
  createAssistantClient,
  type AssistantClient,
} from "@assistant-ui/store/client";
import { describe, expect, it, vi } from "vitest";
import type { ThreadListItemRuntime } from "../../runtime/api/thread-list-item-runtime";
import { ThreadListAdapterChangedError } from "../../types/error";
import { ThreadListItemClient } from "./thread-list-item-runtime-client";

const makeRuntime = (
  rename: (newTitle: string) => Promise<void>,
): ThreadListItemRuntime =>
  ({
    getState: () => ({
      id: "thread-1",
      remoteId: "thread-1",
      externalId: undefined,
      title: "Before",
      status: "regular",
      isMain: true,
      isRunning: false,
      custom: undefined,
    }),
    subscribe: () => () => {},
    rename,
  }) as unknown as ThreadListItemRuntime;

const createClient = (runtime: ThreadListItemRuntime) =>
  createAssistantClient(
    AuiConfig({
      threadListItem: ThreadListItemClient({ runtime }),
    }),
  );

const rename = (client: AssistantClient) =>
  client.threadListItem.rename("After") as unknown as Promise<void>;

describe("ThreadListItemClient command errors", () => {
  it("does not log an adapter-change cancellation", async () => {
    const error = new ThreadListAdapterChangedError();
    const handle = createClient(makeRuntime(() => Promise.reject(error)));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(rename(handle.getClient())).rejects.toBe(error);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      handle.destroy();
    }
  });

  it("logs an ordinary command rejection and preserves it for callers", async () => {
    const error = new Error("rename failed");
    const handle = createClient(makeRuntime(() => Promise.reject(error)));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(rename(handle.getClient())).rejects.toBe(error);
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        "[assistant-ui] thread list item rename failed:",
        error,
      );
    } finally {
      consoleError.mockRestore();
      handle.destroy();
    }
  });
});
