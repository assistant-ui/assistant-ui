import { createTapRoot, useResource } from "@assistant-ui/tap";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttachmentRuntime } from "../../runtime/api/attachment-runtime";
import { AttachmentRuntimeClient } from "./attachment-runtime-client";

describe("AttachmentRuntimeClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports attachment removal failures", async () => {
    const error = new Error("storage unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const state = {
      id: "attachment-1",
      type: "file",
      name: "notes.txt",
      status: { type: "complete" },
      content: [],
      source: "thread-composer",
    };
    const runtime = {
      getState: () => state,
      subscribe: () => () => {},
      remove: () => Promise.reject(error),
    } as unknown as AttachmentRuntime;
    const root = createTapRoot(function AttachmentClientRoot() {
      return useResource(AttachmentRuntimeClient({ runtime }));
    });

    await expect(root.getValue().remove()).rejects.toBe(error);

    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] attachment remove failed:",
      error,
    );
    root.unmount();
  });
});
