// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useAui } from "@assistant-ui/store";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import {
  actSettled,
  makeAdapter,
} from "../../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const model = { run: vi.fn(async () => ({ content: [] })) };

const initializeAs = (remoteId: string) =>
  makeAdapter({
    initialize: vi.fn(async () => ({ remoteId, externalId: undefined })),
  });

const listing = (remoteId: string) =>
  makeAdapter({
    list: vi.fn(async () => ({
      threads: [{ status: "regular" as const, remoteId, custom: {} }],
    })),
    updateCustom: vi.fn(async () => {}),
  });

// Mounts the client path (an adapter without unstable_Provider) and keeps the
// runtime and the item each thread runtime mounted on.
const mount = (adapter: RemoteThreadListAdapter) => {
  const mounted: { remoteId: string | undefined; custom: unknown }[] = [];
  let runtime: AssistantRuntime | undefined;
  const App = () => {
    runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useThreadRuntime() {
        const aui = useAui();
        useState(() => {
          const { remoteId, custom } = aui.threadListItem.getState();
          mounted.push({ remoteId, custom });
        });
        return useLocalRuntime(model);
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  return { mounted, runtime: () => runtime! };
};

describe("useRemoteThreadListRuntime writes the thread list reports a commit later", () => {
  describe("reloadMainThread", () => {
    it("right after initialize, remounts the thread runtime on its remote ID", async () => {
      const { mounted, runtime } = mount(initializeAs("r1"));
      await waitFor(() => expect(mounted).toHaveLength(1));
      const threads = runtime().threads;

      await actSettled(async () => {
        await threads.mainItem.initialize();
        await threads.reloadMainThread();
      });

      expect(mounted).toHaveLength(2);
      expect(mounted[1]!.remoteId).toBe("r1");
    });

    it("right after updateCustom, remounts the thread runtime on the new custom metadata", async () => {
      const { mounted, runtime } = mount(listing("one"));
      await waitFor(() =>
        expect(runtime().threads.getState().threadIds).toContain("one"),
      );
      await actSettled(() => runtime().threads.switchToThread("one"));
      await waitFor(() => expect(mounted.at(-1)!.remoteId).toBe("one"));
      const count = mounted.length;
      const threads = runtime().threads;

      await actSettled(async () => {
        await threads.mainItem.updateCustom({ mode: "b" });
        await threads.reloadMainThread();
      });

      expect(mounted).toHaveLength(count + 1);
      expect(mounted.at(-1)!.custom).toEqual({ mode: "b" });
    });
  });

  describe("updateCustom resolves once the item reports the new custom metadata", () => {
    it("on a new thread", async () => {
      const { mounted, runtime } = mount(makeAdapter());
      await waitFor(() => expect(mounted).toHaveLength(1));
      const item = runtime().threads.mainItem;

      const seen = await actSettled(() =>
        item.updateCustom({ mode: "b" }).then(() => item.getState().custom),
      );

      expect(seen).toEqual({ mode: "b" });
    });

    it("on a listed thread", async () => {
      const { runtime } = mount(listing("one"));
      await waitFor(() =>
        expect(runtime().threads.getState().threadIds).toContain("one"),
      );
      const item = runtime().threads.getItemById("one");

      const seen = await actSettled(() =>
        item.updateCustom({ mode: "b" }).then(() => item.getState().custom),
      );

      expect(seen).toEqual({ mode: "b" });
    });
  });
});
