import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { provideAui } from "../provideAui";
import { useAuiEvent } from "../useAuiEvent";
import Host from "./fixtures/Host.svelte";
import { flushEvents, MessageClient, type AnyClient } from "./clients";

const target = () => document.createElement("div");

describe("useAuiEvent", () => {
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
});
