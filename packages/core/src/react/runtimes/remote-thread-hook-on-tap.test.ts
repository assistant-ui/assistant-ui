import { describe, expect, it } from "vitest";
import {
  createTapRoot,
  resource,
  useResources,
  withKey,
} from "@assistant-ui/tap";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";

const EMPTY_MESSAGES: readonly never[] = [];

const useTestThreadRuntime = () =>
  useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    isRunning: false,
    onNew: async () => {},
  });

const TestThread = resource(useTestThreadRuntime);

describe("runtimeHook hosted under one tap root", () => {
  it("starts N independent threads as keyed resources", () => {
    const ids = ["a", "b", "c"] as const;
    const root = createTapRoot(function RemoteThreadListHost() {
      return useResources(ids.map((id) => withKey(id, TestThread(), [id])));
    });

    try {
      const runtimes = root.getValue();
      expect(runtimes).toHaveLength(3);
      for (const runtime of runtimes) {
        expect(runtime.thread.getState().messages).toEqual([]);
        expect(runtime.thread.getState().isRunning).toBe(false);
      }
      expect(new Set(runtimes).size).toBe(3);
    } finally {
      root.unmount();
    }
  });

  it("keeps a sibling resource after another key is removed", () => {
    let ids = ["first", "second"];
    const root = createTapRoot(function RemoteThreadListHost() {
      return useResources(ids.map((id) => withKey(id, TestThread(), [id])));
    });

    try {
      const [kept] = root.getValue() as [AssistantRuntime, AssistantRuntime];
      ids = ["first"];
      root.getValue();
      expect(root.getValue()[0]).toBe(kept);
      expect(kept.thread.getState().messages).toEqual([]);
    } finally {
      root.unmount();
    }
  });
});
