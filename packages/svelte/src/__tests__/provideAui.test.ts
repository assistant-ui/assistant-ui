import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { provideAui } from "../provideAui";
import { useAui } from "../useAui";
import Host from "./fixtures/Host.svelte";
import Nested from "./fixtures/Nested.svelte";
import LiveConfigHost from "./fixtures/LiveConfigHost.svelte";
import {
  createTrackedThread,
  MessageClient,
  ThreadClient,
  type AnyClient,
} from "./clients";

const target = () => document.createElement("div");

describe("provideAui", () => {
  it("provides a client and returns the stable facade", () => {
    let provided!: AnyClient;
    let fromContext!: AnyClient;
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provided = provideAui(AuiConfig({ thread: ThreadClient() } as never));
          fromContext = useAui();
        },
      },
    });

    expect(fromContext).toBe(provided);
    expect(provided.thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => provided.thread.setSelected(2));
    expect(provided.thread.getState()).toEqual({ selected: 2 });

    flushSync(() => void unmount(app));
  });

  it("soft unmounts the client after the component is destroyed", async () => {
    const { TrackedThread, counters } = createTrackedThread();
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ thread: TrackedThread() } as never));
        },
      },
    });

    expect(counters.mounts).toBeGreaterThan(0);
    const mounted = counters.cleanups;

    flushSync(() => void unmount(app));
    await vi.waitFor(() => expect(counters.cleanups).toBeGreaterThan(mounted));
  });

  it("throws on a nested provider without extends", () => {
    expect(() =>
      mount(Nested, {
        target: target(),
        props: {
          outerSetup: () => {
            provideAui(AuiConfig({ thread: ThreadClient() } as never));
          },
          innerSetup: () => {
            provideAui(AuiConfig({} as never));
          },
        },
      }),
    ).toThrow("A parent provideAui exists.");
  });

  it("extends the parent facade through the live source", () => {
    let outer!: AssistantClient;
    let inner!: AnyClient;
    const app = mount(Nested, {
      target: target(),
      props: {
        outerSetup: () => {
          outer = provideAui(AuiConfig({ thread: ThreadClient() } as never));
        },
        innerSetup: () => {
          inner = provideAui(
            AuiConfig({ message: MessageClient({ id: "m0" }) } as never),
            { extends: outer },
          );
        },
      },
    });

    expect(inner.message.getState()).toEqual({ id: "m0", text: "" });
    expect(inner.thread.getState()).toEqual({ selected: 0 });

    flushSync(() => void unmount(app));
  });

  it("isolates from the parent with extends null", () => {
    let inner!: AnyClient;
    const app = mount(Nested, {
      target: target(),
      props: {
        outerSetup: () => {
          provideAui(AuiConfig({ thread: ThreadClient() } as never));
        },
        innerSetup: () => {
          inner = provideAui(
            AuiConfig({ message: MessageClient({ id: "m0" }) } as never),
            { extends: null },
          );
        },
      },
    });

    expect(inner.message.getState()).toEqual({ id: "m0", text: "" });
    expect(() => inner.thread.getState()).toThrow(
      'The current scope does not have a "thread" property.',
    );

    flushSync(() => void unmount(app));
  });

  it("delivers thunk config changes live, keeping same-key scope state", async () => {
    let exposed!: { aui: AnyClient; setArg: (value: number) => void };
    const app = mount(LiveConfigHost, {
      target: target(),
      props: {
        makeConfig: (arg: number) =>
          AuiConfig({ message: MessageClient({ id: `m${arg}` }) } as never),
        expose: (value: never) => {
          exposed = value;
        },
      },
    });

    expect(exposed.aui.message.getState()).toEqual({ id: "m0", text: "" });
    flushTapSync(() => exposed.aui.message.setText("draft"));

    exposed.setArg(1);
    await vi.waitFor(() =>
      expect(exposed.aui.message.getState()).toEqual({
        id: "m1",
        text: "draft",
      }),
    );

    flushSync(() => void unmount(app));
  });
});
