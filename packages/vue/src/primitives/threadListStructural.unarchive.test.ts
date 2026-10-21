import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
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
  it("tracks adapter support and cannot be enabled by disabled=false", async () => {
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
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadListPrimitiveItems,
          { archived: true },
          {
            default: () =>
              h(
                ThreadListItemPrimitiveUnarchive,
                { disabled: false },
                { default: () => "Restore" },
              ),
          },
        ),
    });
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
            { default: () => h(View) },
          ),
      }),
    );
    const container = document.createElement("div");
    app.mount(container);
    try {
      await vi.waitFor(async () => {
        await nextTick();
        expect(container.querySelector("button")).not.toBeNull();
      });
      const button = container.querySelector("button")!;
      expect(button.disabled).toBe(true);
      button.click();
      expect(onUnarchive).not.toHaveBeenCalled();
      core.setAdapter(makeAdapter(true));
      await vi.waitFor(async () => {
        await nextTick();
        expect(button.disabled).toBe(false);
      });
      button.click();
      expect(onUnarchive).toHaveBeenCalledWith("archived");
      core.setAdapter(makeAdapter(false));
      await vi.waitFor(async () => {
        await nextTick();
        expect(button.disabled).toBe(true);
      });
    } finally {
      app.unmount();
    }
  });
});
