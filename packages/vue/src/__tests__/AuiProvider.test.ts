import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import {
  ThreadClient,
  messageDerived,
  trackers,
  type AnyClient,
} from "./fixtures";

const mountApp = (root: Component) => {
  const app = createApp(root);
  const el = document.createElement("div");
  app.mount(el);
  return { app, unmount: () => app.unmount() };
};

const captureAui = () => {
  let aui!: AnyClient;
  const Probe = defineComponent({
    setup() {
      aui = useAui() as AnyClient;
      return () => null;
    },
  });
  return { Probe, getAui: () => aui };
};

describe("AuiProvider", () => {
  it("provides a client built from the config", () => {
    const { Probe, getAui } = captureAui();
    const { unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ thread: ThreadClient() } as never) },
            { default: () => h(Probe) },
          ),
      }),
    );

    expect(getAui().thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => getAui().thread.setSelected(1));
    expect(getAui().thread.getState()).toEqual({ selected: 1 });

    unmount();
  });

  it("keeps the facade stable across structural changes", () => {
    const { Probe, getAui } = captureAui();
    const { unmount } = mountApp(
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
      }),
    );

    const aui = getAui();
    expect(aui.message.getState().id).toBe("m0");

    flushTapSync(() => aui.thread.setSelected(1));

    expect(getAui()).toBe(aui);
    expect(aui.message.getState().id).toBe("m1");

    unmount();
  });

  it("extends the parent provider's client in nested providers", () => {
    const { Probe, getAui } = captureAui();
    const { unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ thread: ThreadClient() } as never) },
            {
              default: () =>
                h(
                  AuiProvider,
                  { config: AuiConfig({ message: messageDerived() } as never) },
                  { default: () => h(Probe) },
                ),
            },
          ),
      }),
    );

    const aui = getAui();
    expect(aui.message.getState().id).toBe("m0");
    expect(aui.thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => aui.thread.setSelected(1));
    expect(aui.message.getState().id).toBe("m1");

    unmount();
  });

  it("destroys the client on unmount", () => {
    const before = trackers.threadCleanups;
    const { Probe } = captureAui();
    const { unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ thread: ThreadClient() } as never) },
            { default: () => h(Probe) },
          ),
      }),
    );

    const afterMount = trackers.threadCleanups;
    unmount();
    expect(trackers.threadCleanups).toBe(afterMount + 1);
    expect(afterMount).toBeGreaterThanOrEqual(before);
  });

  it("returns the throwing default client outside a provider", () => {
    let aui!: AssistantClient;
    const { unmount } = mountApp(
      defineComponent({
        setup() {
          aui = useAui();
          return () => null;
        },
      }),
    );

    expect(() => (aui as AnyClient).thread.getState()).toThrow(
      "Wrap your component in an <AuiProvider> component.",
    );

    unmount();
  });
});
