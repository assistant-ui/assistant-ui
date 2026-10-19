// @vitest-environment jsdom

import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import {
  AssistantRuntimeProvider,
  ThreadListItemByIndexProvider,
} from "@assistant-ui/core/react";
import { ThreadListItemPrimitiveUnarchive } from "./ThreadListItemUnarchive";

it("keeps an unsupported unarchive disabled and enables it when the adapter supports it", async () => {
  const adapter: ExternalStoreAdapter = {
    messages: [],
    onNew: async () => {},
    adapters: {
      threadList: {
        archivedThreads: [{ id: "archived", status: "archived" }],
      },
    },
  };
  const core = new ExternalStoreRuntimeCore(adapter);
  const runtime = new AssistantRuntimeImpl(core);
  const view = render(
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListItemByIndexProvider index={0} archived>
        <ThreadListItemPrimitiveUnarchive disabled={false}>
          Unarchive
        </ThreadListItemPrimitiveUnarchive>
      </ThreadListItemByIndexProvider>
    </AssistantRuntimeProvider>,
  );
  const button = view.getByRole("button", { name: "Unarchive" });
  expect(button.hasAttribute("disabled")).toBe(true);
  const onUnarchive = vi.fn(async () => {});
  await act(async () =>
    core.setAdapter({
      ...adapter,
      adapters: {
        threadList: { ...adapter.adapters!.threadList, onUnarchive },
      },
    }),
  );
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  fireEvent.click(button);
  await waitFor(() => expect(onUnarchive).toHaveBeenCalledWith("archived"));
  await act(async () => core.setAdapter(adapter));
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(button);
  expect(onUnarchive).toHaveBeenCalledTimes(1);
});
