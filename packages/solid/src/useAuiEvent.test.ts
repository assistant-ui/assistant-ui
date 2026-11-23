import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal } from "solid-js";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { AuiProvider } from "./AuiProvider";
import { useAui } from "./useAui";
import { useAuiEvent } from "./useAuiEvent";
import {
  ThreadClient,
  flushEvents,
  messageDerived,
  mount,
  providerWith,
  type AnyClient,
} from "./testUtils";

const mountWithProvider = (setup: () => void) =>
  mount(() =>
    providerWith(
      AuiConfig({
        thread: ThreadClient(),
        message: messageDerived(),
      } as never),
      () =>
        createComponent(() => {
          setup();
          return null;
        }, {}),
    ),
  );

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

    flushTapSync(() => aui.thread.message({ index: 0 }).ping("old"));
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

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
    const [present, setPresent] = createSignal(false);
    const Probe = () => {
      aui = useAui() as AnyClient;
      useAuiEvent("message.pinged" as never, cb as never);
      return null;
    };
    const { unmount } = mount(() =>
      createComponent(AuiProvider, {
        get config() {
          return present()
            ? AuiConfig({
                thread: ThreadClient(),
                message: messageDerived(),
              } as never)
            : AuiConfig({ thread: ThreadClient() } as never);
        },
        get children() {
          return createComponent(Probe, {});
        },
      }),
    );

    try {
      expect(warnSpy).toHaveBeenCalled();
      expect(cb).not.toHaveBeenCalled();

      setPresent(true);
      await vi.waitFor(() =>
        expect((aui.message as AnyClient).getState().id).toBe("m0"),
      );

      flushTapSync(() => aui.message.ping("hello"));
      await flushEvents();
      expect(cb).toHaveBeenCalledWith({ id: "m0", value: "hello" });
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
});
