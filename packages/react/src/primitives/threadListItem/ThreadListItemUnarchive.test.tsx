// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  ThreadListItemByIndexProvider,
} from "@assistant-ui/core/react";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { ThreadListItemPrimitiveUnarchive } from "./ThreadListItemUnarchive";

afterEach(cleanup);

describe("ThreadListItemPrimitive.Unarchive", () => {
  it.each([true, false])(
    "renders an actionable button only when unarchive is supported (%s)",
    (supported) => {
      const onUnarchive = vi.fn();
      const runtime = new AssistantRuntimeImpl(
        new ExternalStoreRuntimeCore({
          messages: [],
          onNew: async () => {},
          adapters: {
            threadList: {
              archivedThreads: [{ id: "archived", status: "archived" }],
              onUnarchive: supported ? onUnarchive : undefined,
            },
          },
        }),
      );
      const { getByRole } = render(
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadListItemByIndexProvider index={0} archived>
            <ThreadListItemPrimitiveUnarchive disabled={false}>
              Restore
            </ThreadListItemPrimitiveUnarchive>
          </ThreadListItemByIndexProvider>
        </AssistantRuntimeProvider>,
      );
      const button = getByRole("button", {
        name: "Restore",
      }) as HTMLButtonElement;
      expect(button.disabled).toBe(!supported);
      fireEvent.click(button);
      if (supported) expect(onUnarchive).toHaveBeenCalledWith("archived");
      else expect(onUnarchive).not.toHaveBeenCalled();
    },
  );
});
