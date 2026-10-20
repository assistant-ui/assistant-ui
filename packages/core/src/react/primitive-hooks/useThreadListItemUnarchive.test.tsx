// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PropsWithChildren } from "react";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import type { ExternalStoreThreadListAdapter } from "../../runtimes/external-store/external-store-adapter";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { ThreadListItemByIndexProvider } from "../providers/ThreadListItemByIndexProvider";
import { useThreadListItemUnarchive } from "./useThreadListItemUnarchive";

afterEach(cleanup);

const setup = (onUnarchive?: (threadId: string) => void) => {
  const archivedThreads = [
    { id: "archived", title: "Archived", status: "archived" as const },
  ];
  const makeAdapter = (callback = onUnarchive) => ({
    messages: [],
    onNew: async () => {},
    adapters: {
      threadList: {
        archivedThreads,
        onUnarchive: callback,
      } satisfies ExternalStoreThreadListAdapter,
    },
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const wrapper = ({ children }: PropsWithChildren) => (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListItemByIndexProvider index={0} archived>
        {children}
      </ThreadListItemByIndexProvider>
    </AssistantRuntimeProvider>
  );
  return {
    ...renderHook(() => useThreadListItemUnarchive(), { wrapper }),
    setUnarchive: (callback?: (threadId: string) => void) =>
      core.setAdapter(makeAdapter(callback)),
  };
};

describe("useThreadListItemUnarchive", () => {
  it("does not offer unarchive when the adapter cannot restore threads", () => {
    const { result } = setup();
    expect(result.current.disabled).toBe(true);
  });

  it("restores the scoped archived thread when supported", async () => {
    const onUnarchive = vi.fn();
    const { result } = setup(onUnarchive);
    expect(result.current.disabled).toBe(false);
    await act(async () => result.current.unarchive());
    expect(onUnarchive).toHaveBeenCalledWith("archived");
  });

  it("updates availability when only the adapter callback changes", async () => {
    const { result, setUnarchive } = setup();
    const onUnarchive = vi.fn();
    act(() => setUnarchive(onUnarchive));
    await waitFor(() => expect(result.current.disabled).toBe(false));
    act(() => setUnarchive(undefined));
    await waitFor(() => expect(result.current.disabled).toBe(true));
    expect(onUnarchive).not.toHaveBeenCalled();
  });
});
