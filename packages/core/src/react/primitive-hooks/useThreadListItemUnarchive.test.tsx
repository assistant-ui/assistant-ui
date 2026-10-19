// @vitest-environment jsdom

import { Fragment } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuiState } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { ThreadListItemByIndexProvider } from "../providers/ThreadListItemByIndexProvider";
import { useLocalRuntime } from "../runtimes/useLocalRuntime";
import { useRemoteThreadListRuntime } from "../runtimes/useRemoteThreadListRuntime";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { useThreadListItemUnarchive } from "./useThreadListItemUnarchive";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";

function UnarchiveButton() {
  const { unarchive, disabled } = useThreadListItemUnarchive();
  return (
    <button disabled={disabled} onClick={unarchive}>
      Unarchive
    </button>
  );
}

function ArchivedItem() {
  const hasArchived = useAuiState(
    (s) => s.threads.archivedThreadIds.length > 0,
  );
  return hasArchived ? (
    <ThreadListItemByIndexProvider index={0} archived>
      <UnarchiveButton />
    </ThreadListItemByIndexProvider>
  ) : null;
}

function App({ adapter }: { adapter: RemoteThreadListAdapter }) {
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function useThreadRuntime() {
      return useLocalRuntime({ run: async () => ({ content: [] }) });
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ArchivedItem />
    </AssistantRuntimeProvider>
  );
}

it("disables unarchive for a local runtime without a thread list adapter", () => {
  const runtime = new AssistantRuntimeImpl(
    new LocalRuntimeCore(
      {
        adapters: { chatModel: { run: async () => ({ content: [] }) } },
      },
      undefined,
    ),
  );
  const view = render(
    <AssistantRuntimeProvider runtime={runtime}>
      <UnarchiveButton />
    </AssistantRuntimeProvider>,
  );
  expect(view.getByRole("button").hasAttribute("disabled")).toBe(true);
  expect(runtime.threads.getState().canUnarchive).toBe(false);
});

describe.each(["client", "legacy"] as const)(
  "unarchive with the %s remote list",
  (mode) => {
    it("disables unsupported unarchive and follows adapter capability changes", async () => {
      const unarchive = vi.fn(async () => {});
      const adapter = makeAdapter({
        list: vi.fn<RemoteThreadListAdapter["list"]>(async () => ({
          threads: [{ status: "archived", remoteId: "archived" }],
        })),
        ...(mode === "legacy" ? { unstable_Provider: Fragment } : {}),
      });
      delete adapter.unarchive;
      const view = render(<App adapter={adapter} />);
      const button = await view.findByRole("button", { name: "Unarchive" });
      expect(button.hasAttribute("disabled")).toBe(true);
      fireEvent.click(button);
      expect(unarchive).not.toHaveBeenCalled();

      const supported = { ...adapter, unarchive };
      view.rerender(<App adapter={supported} />);
      await waitFor(() =>
        expect(view.getByRole("button").hasAttribute("disabled")).toBe(false),
      );
      fireEvent.click(view.getByRole("button"));
      await waitFor(() => expect(unarchive).toHaveBeenCalledWith("archived"));
      await waitFor(() => expect(view.queryByRole("button")).toBeNull());

      view.rerender(<App adapter={adapter} />);
      await waitFor(() =>
        expect(view.getByRole("button").hasAttribute("disabled")).toBe(true),
      );
    });
  },
);
