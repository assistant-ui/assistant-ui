import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { provideAui } from "../provideAui";
import { useAuiEvent } from "../useAuiEvent";
import Host from "./fixtures/Host.svelte";
import EventScopeHost from "./fixtures/EventScopeHost.svelte";
import { flushEvents, MessageClient, type AnyClient } from "./clients";

const target = () => document.createElement("div");

describe("useAuiEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delivers events to the callback", async () => {
    let aui!: AnyClient;
    const callback = vi.fn();
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          aui = provideAui(
            AuiConfig({ message: MessageClient({ id: "m0" }) } as never),
          );
          useAuiEvent("message.pinged" as never, callback);
        },
      },
    });

    flushTapSync(() => aui.message.ping("hello"));
    await flushEvents();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ id: "m0", value: "hello" });

    flushSync(() => void unmount(app));
  });

  it("stops delivering after the component is destroyed", async () => {
    let aui!: AnyClient;
    const callback = vi.fn();
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          aui = provideAui(
            AuiConfig({ message: MessageClient({ id: "m0" }) } as never),
          );
          useAuiEvent("message.pinged" as never, callback);
        },
      },
    });

    flushTapSync(() => aui.message.ping("before"));
    await flushEvents();
    expect(callback).toHaveBeenCalledTimes(1);

    flushSync(() => void unmount(app));
    flushTapSync(() => aui.message.ping("after"));
    await flushEvents();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("binds once its scope appears in a live config, without detaching", async () => {
    let exposed!: { aui: AnyClient; setPresent: (value: boolean) => void };
    const onPing = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const makeConfig = (present: boolean) =>
      present
        ? AuiConfig({ message: MessageClient({ id: "m0" }) } as never)
        : AuiConfig({} as never);
    const app = mount(EventScopeHost, {
      target: target(),
      props: {
        makeConfig,
        onPing,
        expose: (value: never) => {
          exposed = value;
        },
      },
    });

    // The message scope is absent at mount: binding is a pending no-op that
    // surfaces in dev via warn, never a thrown-and-swallowed error
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    exposed.setPresent(true);
    await vi.waitFor(() =>
      expect(exposed.aui.message.getState().id).toBe("m0"),
    );

    flushTapSync(() => exposed.aui.message.ping("hello"));
    await flushEvents();
    expect(onPing).toHaveBeenCalledWith({ id: "m0", value: "hello" });
    expect(errorSpy).not.toHaveBeenCalled();

    flushSync(() => void unmount(app));
  });
});
