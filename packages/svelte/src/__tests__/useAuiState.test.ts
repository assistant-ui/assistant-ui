import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { getAuiContext } from "../context";
import { provideAui } from "../provideAui";
import { useAuiState } from "../useAuiState";
import Host from "./fixtures/Host.svelte";
import StateProbe from "./fixtures/StateProbe.svelte";
import SelectorProbe from "./fixtures/SelectorProbe.svelte";
import {
  flushEvents,
  MessageClient,
  ThreadClient,
  type AnyClient,
} from "./clients";

const target = () => document.createElement("div");

describe("useAuiState", () => {
  it("tracks a reactive input reached after an equal store selection", async () => {
    let aui!: AnyClient;
    const subscriptions = vi.fn();
    const releases = vi.fn();
    const container = target();
    const app = mount(SelectorProbe, {
      target: container,
      props: {
        setup: function useConditionalSelection(getIndex: () => number) {
          aui = provideAui(AuiConfig({ thread: ThreadClient() } as never));
          const context = getAuiContext();
          const subscribe: typeof context.source.subscribe = (listener) => {
            subscriptions();
            const release = context.source.subscribe(listener);
            return () => {
              releases();
              release();
            };
          };
          return useAuiState(
            (s) => (s as AnyClient).thread.selected === 1 && getIndex() === 1,
            { item: { ...context, source: { ...context.source, subscribe } } },
          );
        },
      },
    });

    try {
      flushSync();
      expect(container.querySelector("output")!.textContent).toBe(
        "not selected",
      );

      flushTapSync(() => aui.thread.setSelected(1));
      await flushEvents();
      flushSync();
      expect(container.querySelector("output")!.textContent).toBe(
        "not selected",
      );
      expect(subscriptions).toHaveBeenCalledTimes(1);

      container.querySelector("button")!.click();
      flushSync();
      expect(container.querySelector("output")!.textContent).toBe("selected");
      expect(subscriptions).toHaveBeenCalledTimes(1);
    } finally {
      flushSync(() => void unmount(app));
      await flushEvents();
      expect(releases).toHaveBeenCalledTimes(1);
    }
  });

  it("updates rendered selection after a reactive selector input changes", async () => {
    let aui!: AnyClient;
    const container = target();
    const app = mount(SelectorProbe, {
      target: container,
      props: {
        setup: function useSelectedIndex(getIndex: () => number) {
          aui = provideAui(AuiConfig({ thread: ThreadClient() } as never));
          return useAuiState(
            (s) => (s as AnyClient).thread.selected === getIndex(),
          );
        },
      },
    });

    try {
      flushSync();
      expect(container.querySelector("output")!.textContent).toBe("selected");
      container.querySelector("button")!.click();
      flushSync();
      expect(container.querySelector("output")!.textContent).toBe(
        "not selected",
      );

      flushTapSync(() => aui.thread.setSelected(1));
      await flushEvents();
      flushSync();
      expect(container.querySelector("output")!.textContent).toBe("selected");
    } finally {
      flushSync(() => void unmount(app));
    }
  });

  it("deduplicates against the latest reactive selection", async () => {
    let aui!: AnyClient;
    const input = new SvelteMap([["selected", 0]]);
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: function useSelection() {
          aui = provideAui(
            AuiConfig({
              thread: ThreadClient(),
              message: MessageClient({ id: "m0" }),
            } as never),
          );
          const selected = useAuiState(
            (s) => (s as AnyClient).thread.selected === input.get("selected"),
          );
          return () => selected.current;
        },
        onValue,
      },
    });

    try {
      await vi.waitFor(() => expect(onValue).toHaveBeenLastCalledWith(true));
      input.set("selected", 1);
      await vi.waitFor(() => expect(onValue).toHaveBeenLastCalledWith(false));
      const calls = onValue.mock.calls.length;

      flushTapSync(() => aui.message.setText("unrelated"));
      await flushEvents();
      expect(onValue).toHaveBeenCalledTimes(calls);

      flushTapSync(() => aui.thread.setSelected(1));
      await vi.waitFor(() => expect(onValue).toHaveBeenLastCalledWith(true));
    } finally {
      flushSync(() => void unmount(app));
    }
  });

  it("tracks the selected slice inside an effect", async () => {
    let aui!: AnyClient;
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: () => {
          aui = provideAui(AuiConfig({ thread: ThreadClient() } as never));
          const selected = useAuiState((s) => (s as AnyClient).thread.selected);
          return () => selected.current;
        },
        onValue,
      },
    });

    await vi.waitFor(() => expect(onValue).toHaveBeenCalledWith(0));

    flushTapSync(() => aui.thread.setSelected(3));
    await vi.waitFor(() => expect(onValue).toHaveBeenCalledWith(3));

    flushSync(() => void unmount(app));
  });

  it("stops tracking reactive selector inputs after unmount", async () => {
    const input = new SvelteMap([["selected", 0]]);
    const selector = vi.fn(
      (s: AnyClient) => s.thread.selected === input.get("selected"),
    );
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: function useTrackedSelection() {
          provideAui(AuiConfig({ thread: ThreadClient() } as never));
          const selected = useAuiState(selector);
          return () => selected.current;
        },
        onValue,
      },
    });

    await vi.waitFor(() => expect(onValue).toHaveBeenLastCalledWith(true));
    flushSync(() => void unmount(app));
    await flushEvents();
    const reads = selector.mock.calls.length;

    input.set("selected", 1);
    flushSync();
    await flushEvents();
    expect(selector).toHaveBeenCalledTimes(reads);
  });

  it("surfaces selector errors and recovers when reactive inputs change", async () => {
    const input = new SvelteMap([["unavailable", false]]);
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: function useFallibleSelection() {
          provideAui(AuiConfig({ thread: ThreadClient() } as never));
          const selected = useAuiState((s) => {
            if (input.get("unavailable")) throw new Error("unavailable");
            return (s as AnyClient).thread.selected;
          });
          return () => {
            try {
              return selected.current;
            } catch (error) {
              return (error as Error).message;
            }
          };
        },
        onValue,
      },
    });

    try {
      await vi.waitFor(() => expect(onValue).toHaveBeenLastCalledWith(0));
      input.set("unavailable", true);
      await vi.waitFor(() =>
        expect(onValue).toHaveBeenLastCalledWith("unavailable"),
      );
      input.set("unavailable", false);
      await vi.waitFor(() => expect(onValue).toHaveBeenLastCalledWith(0));
    } finally {
      flushSync(() => void unmount(app));
    }
  });

  it("does not wake an effect when an unrelated slice changes", async () => {
    let aui!: AnyClient;
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: () => {
          aui = provideAui(
            AuiConfig({
              thread: ThreadClient(),
              message: MessageClient({ id: "m0" }),
            } as never),
          );
          const selected = useAuiState((s) => (s as AnyClient).thread.selected);
          return () => selected.current;
        },
        onValue,
      },
    });

    await vi.waitFor(() => expect(onValue).toHaveBeenCalledTimes(1));

    // Mutating a different scope notifies the store, but the selected slice is
    // unchanged, so the effect must not re-run
    flushTapSync(() => aui.message.setText("draft"));
    await flushEvents();
    expect(onValue).toHaveBeenCalledTimes(1);

    // A real change to the selected slice still wakes it
    flushTapSync(() => aui.thread.setSelected(1));
    await vi.waitFor(() => expect(onValue).toHaveBeenCalledTimes(2));

    flushSync(() => void unmount(app));
  });

  it("reads the current value outside effects without subscribing", () => {
    let aui!: AnyClient;
    let selected!: { readonly current: number };
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          aui = provideAui(AuiConfig({ thread: ThreadClient() } as never));
          selected = useAuiState((s) => (s as AnyClient).thread.selected);
        },
      },
    });

    expect(selected.current).toBe(0);
    flushTapSync(() => aui.thread.setSelected(5));
    expect(selected.current).toBe(5);

    flushSync(() => void unmount(app));
  });

  it("throws on returning the entire state", () => {
    let state!: { readonly current: unknown };
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ thread: ThreadClient() } as never));
          state = useAuiState((s) => s);
        },
      },
    });

    expect(() => state.current).toThrow(
      "You tried to return the entire AssistantState.",
    );

    flushSync(() => void unmount(app));
  });

  it("resolves unavailable scopes to undefined via optional", () => {
    let missing!: { readonly current: unknown };
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ thread: ThreadClient() } as never));
          missing = useAuiState((s) => (s.optional as AnyClient).missing);
        },
      },
    });

    expect(missing.current).toBeUndefined();

    flushSync(() => void unmount(app));
  });
});
