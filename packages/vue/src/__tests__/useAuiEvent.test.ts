import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  ref,
  type Component,
} from "vue";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
  it("binds once its scope appears in a live config, without detaching", async () => {
    let aui!: AnyClient;
    const cb = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const present = ref(false);
    const Probe = defineComponent({
      setup() {
        aui = useAui() as AnyClient;
        useAuiEvent("message.pinged" as never, cb as never);
        return () => null;
      },
    });
    const app = createApp(
      defineComponent({
        setup: () => {
          const config = computed(() =>
            present.value
              ? (AuiConfig({
                  thread: ThreadClient(),
                  message: messageDerived(),
                } as never) as never)
              : (AuiConfig({ thread: ThreadClient() } as never) as never),
          );
          return () =>
            h(
              AuiProvider,
              { config: config.value },
              { default: () => h(Probe) },
            );
        },
      }) as Component,
    );
    app.mount(document.createElement("div"));

    try {
      expect(warnSpy).toHaveBeenCalled();
      expect(cb).not.toHaveBeenCalled();

      present.value = true;
      await vi.waitFor(() =>
        expect((aui.message as AnyClient).getState().id).toBe("m0"),
      );

      flushTapSync(() => aui.message.ping("hello"));
      await flushEvents();
      expect(cb).toHaveBeenCalledWith({ id: "m0", value: "hello" });
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      app.unmount();
    }
  });
});
