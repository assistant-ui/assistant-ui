import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiEvent } from "../useAuiEvent";
import {
  ThreadClient,
  flushEvents,
  messageDerived,
  type AnyClient,
} from "./fixtures";

const mountWithProvider = (setup: () => void) => {
  const Probe = defineComponent({
    setup() {
      setup();
      return () => null;
    },
  });
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          {
            config: AuiConfig({
              thread: ThreadClient(),
              message: messageDerived(),
            } as never),
          },
          { default: () => h(Probe) },
        ),
    }) as Component,
  );
  app.mount(document.createElement("div"));
  return { unmount: () => app.unmount() };
};

describe("useAuiEvent", () => {
  it("delivers scope-filtered events on a microtask", async () => {
    let aui!: AnyClient;
    const cb = vi.fn();
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      useAuiEvent("message.pinged" as never, cb as never);
    });

    flushTapSync(() => aui.thread.message({ index: 1 }).ping("other"));
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    flushTapSync(() => aui.message.ping("bound"));
    await flushEvents();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ id: "m0", value: "bound" });

    unmount();
  });

  it("follows the client across structural changes", async () => {
    let aui!: AnyClient;
    const cb = vi.fn();
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      useAuiEvent("message.pinged" as never, cb as never);
    });

    flushTapSync(() => aui.thread.setSelected(1));

    flushTapSync(() => aui.message.ping("after-rebind"));
    await flushEvents();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ id: "m1", value: "after-rebind" });

    unmount();
  });

  it("stops delivering after unmount", async () => {
    let aui!: AnyClient;
    const cb = vi.fn();
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      useAuiEvent("message.pinged" as never, cb as never);
    });

    unmount();

    flushTapSync(() => aui.thread.message({ index: 0 }).ping("late"));
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();
  });
});
