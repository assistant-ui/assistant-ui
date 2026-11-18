import { describe, expect, it, vi } from "vitest";
import { createComponent } from "solid-js";
import { render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadListPrimitiveItems } from "./threadList";
import { ThreadListItemPrimitiveUnarchive } from "./threadListStructural";

describe("ThreadListItemPrimitiveUnarchive", () => {
  it("tracks adapter support and cannot be enabled by disabled=false", () => {
    const onUnarchive = vi.fn();
    const archivedThreads = [{ id: "archived", status: "archived" as const }];
    const makeAdapter = (supported: boolean) => ({
      messages: [],
      onNew: async () => {},
      adapters: {
        threadList: {
          archivedThreads,
          onUnarchive: supported ? onUnarchive : undefined,
        },
      },
    });
    const core = new ExternalStoreRuntimeCore(makeAdapter(false));
    const runtime = new AssistantRuntimeImpl(core);
    const container = document.createElement("div");
    document.body.append(container);
    const dispose = render(
      () =>
        createComponent(AuiProvider, {
          config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
          get children() {
            return createComponent(ThreadListPrimitiveItems, {
              archived: true,
              get children() {
                return createComponent(ThreadListItemPrimitiveUnarchive, {
                  disabled: false,
                  children: "Restore",
                });
              },
            });
          },
        }),
      container,
    );
    try {
      const button = container.querySelector("button")!;
      expect(button).not.toBeNull();
      expect(button.disabled).toBe(true);
      button.click();
      expect(onUnarchive).not.toHaveBeenCalled();
      flushTapSync(() => core.setAdapter(makeAdapter(true)));
      expect(button.disabled).toBe(false);
      flushTapSync(() => button.click());
      expect(onUnarchive).toHaveBeenCalledWith("archived");
      flushTapSync(() => core.setAdapter(makeAdapter(false)));
      expect(button.disabled).toBe(true);
    } finally {
      dispose();
      container.remove();
    }
  });
});
