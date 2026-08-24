import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type Component,
} from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import {
  MessageClient,
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

  it("extends the parent provider's client with an explicit extends", () => {
    const { Probe, getAui } = captureAui();
    const Nested = defineComponent({
      setup(_, { slots }) {
        const aui = useAui();
        return () =>
          h(
            AuiProvider,
            {
              config: AuiConfig({ message: messageDerived() } as never),
              extends: aui,
            },
            { default: () => slots.default?.() },
          );
      },
    });
    const { unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ thread: ThreadClient() } as never) },
            { default: () => h(Nested, null, { default: () => h(Probe) }) },
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

  it("throws in dev when nested without an explicit extends", () => {
    const Nested = defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ message: messageDerived() } as never) },
          { default: () => null },
        ),
    });
    expect(() =>
      mountApp(
        defineComponent({
          setup: () => () =>
            h(
              AuiProvider,
              { config: AuiConfig({ thread: ThreadClient() } as never) },
              { default: () => h(Nested) },
            ),
        }),
      ),
    ).toThrow("A parent AuiProvider exists.");
  });

  it("isolates from the parent with extends null", () => {
    const { Probe, getAui } = captureAui();
    const Isolated = defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          {
            config: AuiConfig({
              message: MessageClient({ id: "iso" }),
            } as never),
            extends: null,
          },
          { default: () => h(Probe) },
        ),
    });
    const { unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ thread: ThreadClient() } as never) },
            { default: () => h(Isolated) },
          ),
      }),
    );

    expect(getAui().message.getState()).toEqual({ id: "iso", text: "" });
    expect(() => getAui().thread.getState()).toThrow(
      'The current scope does not have a "thread" property.',
    );

    unmount();
  });

  it("applies config changes in place, keeping scope state", async () => {
    const { Probe, getAui } = captureAui();
    const config = shallowRef(
      AuiConfig({ message: MessageClient({ id: "m0" }) } as never),
    );
    const { unmount } = mountApp(
      defineComponent({
        setup: () => () =>
          h(AuiProvider, { config: config.value }, { default: () => h(Probe) }),
      }),
    );

    flushTapSync(() => getAui().message.setText("draft"));
    expect(getAui().message.getState()).toEqual({ id: "m0", text: "draft" });

    config.value = AuiConfig({ message: MessageClient({ id: "m1" }) } as never);
    await nextTick();
    await vi.waitFor(() => {
      expect(getAui().message.getState()).toEqual({ id: "m1", text: "draft" });
    });

    config.value = AuiConfig({
      message: MessageClient({ id: "m1" }),
      thread: ThreadClient(),
    } as never);
    await nextTick();
    await vi.waitFor(() => {
      expect(getAui().thread.getState()).toEqual({ selected: 0 });
    });
    expect(getAui().message.getState()).toEqual({ id: "m1", text: "draft" });

    config.value = AuiConfig({ message: MessageClient({ id: "m1" }) } as never);
    await nextTick();
    await vi.waitFor(() => {
      expect(() => getAui().thread.getState()).toThrow(
        'The current scope does not have a "thread" property.',
      );
    });

    unmount();
  });

  it("releases the client on unmount, soft unmounting its scopes", async () => {
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
    await vi.waitFor(() =>
      expect(trackers.threadCleanups).toBe(afterMount + 1),
    );
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
