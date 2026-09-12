// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fromThreadMessageLike } from "../../runtime/utils/thread-message-like";
import { useRuntimeAdapters } from "../runtimes/RuntimeAdapterProvider";
import { createLocalStorageAdapter } from "./LocalStorageThreadListAdapter";

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    threadListItem: {
      getState: () => ({ remoteId: "thread-1" }),
      initialize: async () => ({ remoteId: "thread-1" }),
    },
  }),
}));

describe("local storage history recovery", () => {
  it.each(["assistant", "user"] as const)(
    "keeps the conversation after a damaged %s part is saved and reloaded",
    async (role) => {
      const message = (
        id: string,
        messageRole: typeof role,
        content: unknown[],
      ) => ({
        id,
        role: messageRole,
        content,
        createdAt: "2026-01-01T00:00:00.000Z",
        metadata: { custom: {} },
      });
      const content =
        role === "assistant"
          ? [
              { type: "text", text: "" },
              { type: "text", text: " \n" },
              { type: "reasoning", text: "", unstable_summary: "" },
              { type: "image", image: "https://localhost/image.png" },
              { type: "generative-ui", spec: {} },
              { type: "file", data: "bytes" },
            ]
          : [{ type: "text", text: "keep this" }];
      const key = "@assistant-ui:messages:thread-1";
      const original = JSON.stringify({
        headId: "later",
        messages: [
          {
            message: message("damaged", role, [null, ...content]),
            parentId: null,
          },
          {
            message: message("later", "user", [
              { type: "text", text: "later question" },
            ]),
            parentId: "damaged",
          },
        ],
      });
      const values = new Map([[key, original]]);
      const storage = {
        getItem: async (name: string) => values.get(name) ?? null,
        setItem: async (name: string, value: string) => {
          values.set(name, value);
        },
        removeItem: async (name: string) => {
          values.delete(name);
        },
      };
      const adapter = createLocalStorageAdapter({ storage });
      const { result, unmount } = renderHook(() => useRuntimeAdapters(), {
        wrapper: adapter.unstable_Provider!,
      });
      const history = result.current.history!;
      const loaded = await history.load();
      expect(values.get(key)).toBe(original);
      expect(loaded.messages.map(({ message }) => message.id)).toEqual([
        "damaged",
        "later",
      ]);
      expect(loaded.messages[0]?.message.content).toEqual(content);

      await history.append({
        parentId: "later",
        message: fromThreadMessageLike(
          { id: "new", role: "user", content: "new question" },
          "new",
          { type: "complete", reason: "stop" },
        ),
      });
      unmount();

      const refreshed = renderHook(() => useRuntimeAdapters(), {
        wrapper: createLocalStorageAdapter({ storage }).unstable_Provider!,
      });
      const reloaded = await refreshed.result.current.history!.load();
      expect(reloaded.messages.slice(0, 2)).toEqual(loaded.messages);
      expect(reloaded.messages.map(({ message }) => message.id)).toEqual([
        "damaged",
        "later",
        "new",
      ]);
      expect(reloaded.headId).toBe("new");
      refreshed.unmount();
    },
  );
});
