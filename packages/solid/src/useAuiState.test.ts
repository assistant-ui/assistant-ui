import { describe, expect, it, vi } from "vitest";
import {
  createComponent,
  createEffect,
  createSignal,
  createRoot,
  on,
  type Accessor,
} from "solid-js";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { useAui } from "./useAui";
import { useAuiState } from "./useAuiState";
import {
  ThreadClient,
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

describe("useAuiState", () => {
  it("selects state and updates when the store notifies", () => {
    let aui!: AnyClient;
    let selected!: Accessor<number>;
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      selected = useAuiState((s) => (s as AnyClient).thread.selected);
    });

    expect(selected()).toBe(0);

    flushTapSync(() => aui.thread.setSelected(1));
    expect(selected()).toBe(1);

    unmount();
  });

  it("updates through the real scheduler without a manual flush", async () => {
    let aui!: AnyClient;
    let selected!: Accessor<number>;
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      selected = useAuiState((s) => (s as AnyClient).thread.selected);
    });

    aui.thread.setSelected(1);
    // The tap scheduler flushes on a MessageChannel macrotask whose ordering
    // against timers is unspecified; poll instead of racing a single timer
    await vi.waitFor(() => {
      expect(selected()).toBe(1);
    });

    unmount();
  });

  it("re-runs dependents only when the slice changes by Object.is", () => {
    let aui!: AnyClient;
    let id!: Accessor<string>;
    const effect = vi.fn();
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      id = useAuiState((s) => (s as AnyClient).message.id);
      createEffect(on(id, effect, { defer: true }));
    });

    flushTapSync(() => aui.thread.message({ index: 0 }).setText("hello"));
    expect(effect).not.toHaveBeenCalled();

    flushTapSync(() => aui.thread.setSelected(1));
    expect(effect).toHaveBeenCalledTimes(1);
    expect(id()).toBe("m1");

    unmount();
  });

  it("settles every accessor before dependents run", () => {
    let aui!: AnyClient;
    const seen: [number, number][] = [];
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      const a = useAuiState((s) => (s as AnyClient).thread.selected as number);
      const b = useAuiState(
        (s) => ((s as AnyClient).thread.selected as number) * 10,
      );
      createEffect(on([a, b], ([x, y]) => seen.push([x, y]), { defer: true }));
    });

    flushTapSync(() => aui.thread.setSelected(1));
    expect(seen).toEqual([[1, 10]]);

    unmount();
  });

  it("tracks signals the selector reads", () => {
    let aui!: AnyClient;
    let text!: Accessor<string>;
    const [index, setIndex] = createSignal(0);
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      text = useAuiState(
        () => aui.thread.message({ index: index() }).getState().id,
      );
    });

    expect(text()).toBe("m0");
    setIndex(1);
    expect(text()).toBe("m1");

    unmount();
  });

  it("throws when the selector returns the whole state", () => {
    expect(() =>
      mountWithProvider(() => {
        useAuiState((s) => s);
      }),
    ).toThrow("You tried to return the entire AssistantState.");
  });

  it("throws the provider error outside a provider", () => {
    expect(() =>
      mount(() => {
        useAuiState((s) => (s as AnyClient).thread.selected);
        return null;
      }),
    ).toThrow("Wrap your component in an <AuiProvider> component.");
  });

  it("resolves unavailable scopes to undefined via optional", () => {
    let missing!: Accessor<unknown>;
    const { unmount } = mountWithProvider(() => {
      missing = useAuiState((s) => (s.optional as AnyClient).missing);
    });

    expect(missing()).toBeUndefined();

    unmount();
  });

  it("stops recomputing once its owner is disposed", () => {
    let aui!: AnyClient;
    let live!: Accessor<number>;
    let disposeConsumer!: () => void;
    const selector = vi.fn((s: AnyClient) => s.thread.selected);
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      live = useAuiState((s) => (s as AnyClient).thread.selected);
      createRoot((dispose) => {
        disposeConsumer = dispose;
        useAuiState(selector as never);
      });
    });

    const initialRuns = selector.mock.calls.length;
    flushTapSync(() => aui.thread.setSelected(1));
    expect(selector.mock.calls.length).toBeGreaterThan(initialRuns);

    disposeConsumer();
    const runs = selector.mock.calls.length;
    flushTapSync(() => aui.thread.setSelected(0));
    expect(live()).toBe(0);
    expect(selector).toHaveBeenCalledTimes(runs);

    unmount();
  });
});
