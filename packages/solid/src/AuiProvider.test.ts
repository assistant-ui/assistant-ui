import { describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, onCleanup } from "solid-js";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { AuiProvider } from "./AuiProvider";
import { useAui } from "./useAui";
import {
  MessageClient,
  ThreadClient,
  captureAui,
  messageDerived,
  mount,
  providerWith,
  trackers,
  type AnyClient,
  ThrowingCleanup,
} from "./testUtils";

describe("AuiProvider", () => {
  it("provides a client built from the config", () => {
    const { Probe, getAui } = captureAui();
    const { unmount } = mount(() =>
      providerWith(AuiConfig({ thread: ThreadClient() } as never), Probe),
    );

    expect(getAui().thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => getAui().thread.setSelected(1));
    expect(getAui().thread.getState()).toEqual({ selected: 1 });

    unmount();
  });

  it("keeps the facade stable across structural changes", () => {
    const { Probe, getAui } = captureAui();
    const { unmount } = mount(() =>
      providerWith(
        AuiConfig({
          thread: ThreadClient(),
          message: messageDerived(),
        } as never),
        Probe,
      ),
    );

    const aui = getAui();
    expect(aui.message.getState().id).toBe("m0");

    flushTapSync(() => aui.thread.setSelected(1));

    expect(aui.message.getState().id).toBe("m1");

    unmount();
  });

  it("extends the parent provider's client with an explicit extends", () => {
    const { Probe, getAui } = captureAui();
    const Nested = () =>
      providerWith(AuiConfig({ message: messageDerived() } as never), Probe, {
        extends: useAui(),
      });
    const { unmount } = mount(() =>
      providerWith(AuiConfig({ thread: ThreadClient() } as never), () =>
        createComponent(Nested, {}),
      ),
    );

    const aui = getAui();
    expect(aui.message.getState().id).toBe("m0");
    expect(aui.thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => aui.thread.setSelected(1));
    expect(aui.message.getState().id).toBe("m1");

    unmount();
  });

  it("throws in dev when nested without an explicit extends", () => {
    const Nested = () =>
      providerWith(
        AuiConfig({ message: messageDerived() } as never),
        () => null,
      );
    expect(() =>
      mount(() =>
        providerWith(AuiConfig({ thread: ThreadClient() } as never), () =>
          createComponent(Nested, {}),
        ),
      ),
    ).toThrow("A parent AuiProvider exists.");
  });

  it("isolates from the parent with extends null", () => {
    const { Probe, getAui } = captureAui();
    const Isolated = () =>
      providerWith(
        AuiConfig({ message: MessageClient({ id: "iso" }) } as never),
        Probe,
        { extends: null },
      );
    const { unmount } = mount(() =>
      providerWith(AuiConfig({ thread: ThreadClient() } as never), () =>
        createComponent(Isolated, {}),
      ),
    );

    expect(getAui().message.getState()).toEqual({ id: "iso", text: "" });
    expect(() => getAui().thread.getState()).toThrow(
      'The current scope does not have a "thread" property.',
    );

    unmount();
  });

  it("applies config changes in place, keeping scope state", async () => {
    const { Probe, getAui } = captureAui();
    const [config, setConfig] = createSignal(
      AuiConfig({ message: MessageClient({ id: "m0" }) } as never),
    );
    const { unmount } = mount(() =>
      createComponent(AuiProvider, {
        get config() {
          return config();
        },
        get children() {
          return createComponent(Probe, {});
        },
      }),
    );

    flushTapSync(() => getAui().message.setText("draft"));
    expect(getAui().message.getState()).toEqual({ id: "m0", text: "draft" });

    setConfig(AuiConfig({ message: MessageClient({ id: "m1" }) } as never));
    await vi.waitFor(() => {
      expect(getAui().message.getState()).toEqual({ id: "m1", text: "draft" });
    });

    setConfig(
      AuiConfig({
        message: MessageClient({ id: "m1" }),
        thread: ThreadClient(),
      } as never),
    );
    await vi.waitFor(() => {
      expect(getAui().thread.getState()).toEqual({ selected: 0 });
    });
    expect(getAui().message.getState()).toEqual({ id: "m1", text: "draft" });

    setConfig(AuiConfig({ message: MessageClient({ id: "m1" }) } as never));
    await vi.waitFor(() => {
      expect(() => getAui().thread.getState()).toThrow(
        'The current scope does not have a "thread" property.',
      );
    });

    unmount();
  });

  it("destroys the client on unmount, releasing its scopes at once", () => {
    const { Probe } = captureAui();
    const { unmount } = mount(() =>
      providerWith(AuiConfig({ thread: ThreadClient() } as never), Probe),
    );

    const afterMount = trackers.threadCleanups;
    unmount();
    expect(trackers.threadCleanups).toBe(afterMount + 1);
  });

  it("reports a throwing cleanup and still disposes its subtree", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const childDisposed = vi.fn();
    const Child = () => {
      onCleanup(childDisposed);
      return null;
    };
    const { unmount } = mount(() =>
      providerWith(AuiConfig({ thread: ThrowingCleanup() } as never), () =>
        createComponent(Child, {}),
      ),
    );

    try {
      expect(() => unmount()).not.toThrow();
      expect(childDisposed).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "[assistant-ui] AuiProvider cleanup threw an error",
        expect.anything(),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns the throwing default client outside a provider", () => {
    let aui!: AssistantClient;
    const { unmount } = mount(() => {
      aui = useAui();
      return null;
    });

    expect(() => (aui as AnyClient).thread.getState()).toThrow(
      "Wrap your component in an <AuiProvider> component.",
    );

    unmount();
  });
});
