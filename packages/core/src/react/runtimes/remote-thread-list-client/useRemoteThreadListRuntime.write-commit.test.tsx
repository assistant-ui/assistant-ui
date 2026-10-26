// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { type AssistantClient, useAui } from "@assistant-ui/store";
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

const model = { run: vi.fn(async () => ({ content: [] })) };

// Mounts the client path (an adapter without unstable_Provider) and keeps the
// runtime, the client a thread runtime hook sees, the client a component under
// the provider sees, and the item each thread runtime mounted on.
const mount = (adapter: RemoteThreadListAdapter) => {
  const mounted: { remoteId: string | undefined; custom: unknown }[] = [];
  const scopes: {
    runtime?: AssistantRuntime;
    hook?: AssistantClient;
    surface?: AssistantClient;
  } = {};
  const Surface = () => {
    scopes.surface = useAui();
    return null;
  };
  const App = () => {
    scopes.runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useThreadRuntime() {
        const aui = useAui();
        scopes.hook = aui;
        useState(() => {
          const { remoteId, custom } = aui.threadListItem.getState();
          mounted.push({ remoteId, custom });
        });
        return useLocalRuntime(model);
      },
    });
    return (
      <AssistantRuntimeProvider runtime={scopes.runtime}>
        <Surface />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  return { mounted, scopes };
};

describe("useRemoteThreadListRuntime writes resolve once getState() reports them", () => {
  describe("initialize", () => {
    it("through the runtime's item", async () => {
      const { mounted, scopes } = mount(initializeAs("r1"));
      await waitFor(() => expect(mounted).toHaveLength(1));
      const item = scopes.runtime!.threads.mainItem;

      const seen = await actSettled(() =>
        item.initialize().then(() => item.getState().remoteId),
      );

      expect(seen).toBe("r1");
    });

    it("through the client a thread runtime hook sees", async () => {
      const { mounted, scopes } = mount(initializeAs("r1"));
      await waitFor(() => expect(mounted).toHaveLength(1));
      const aui = scopes.hook!;

      const seen = await actSettled(() =>
        aui.threadListItem
          .initialize()
          .then(() => aui.threadListItem.getState().remoteId),
      );

      expect(seen).toBe("r1");
    });

    it("through the client a component under the provider sees", async () => {
      const { mounted, scopes } = mount(initializeAs("r1"));
      await waitFor(() => expect(mounted).toHaveLength(1));
      const aui = scopes.surface!;

      const seen = await actSettled(() =>
        aui.threads
          .item("main")
          .initialize()
          .then(() => [
            aui.threads.item("main").getState().remoteId,
            aui.threadListItem.getState().remoteId,
          ]),
      );

      expect(seen).toEqual(["r1", "r1"]);
    });

    it("lets reloadMainThread remount the thread runtime on its remote ID", async () => {
      const { mounted, scopes } = mount(initializeAs("r1"));
      await waitFor(() => expect(mounted).toHaveLength(1));
      const threads = scopes.runtime!.threads;

      await actSettled(async () => {
        await threads.mainItem.initialize();
        await threads.reloadMainThread();
      });

      expect(mounted).toHaveLength(2);
      expect(mounted[1]!.remoteId).toBe("r1");
    });
  });

  describe("updateCustom", () => {
    it("on a new thread, through the runtime's item", async () => {
      const { mounted, scopes } = mount(makeAdapter());
      await waitFor(() => expect(mounted).toHaveLength(1));
      const item = scopes.runtime!.threads.mainItem;

      const seen = await actSettled(() =>
        item.updateCustom({ mode: "b" }).then(() => item.getState().custom),
      );

      expect(seen).toEqual({ mode: "b" });
    });

    it("on a listed thread, through the runtime's item", async () => {
      const { scopes } = mount(listing("one"));
      await waitFor(() =>
        expect(scopes.runtime!.threads.getState().threadIds).toContain("one"),
      );
      const item = scopes.runtime!.threads.getItemById("one");

      const seen = await actSettled(() =>
        item.updateCustom({ mode: "b" }).then(() => item.getState().custom),
      );

      expect(seen).toEqual({ mode: "b" });
    });
  });
});
