import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  watch,
  type Component,
  type ComputedRef,
} from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { ThreadClient, messageDerived, type AnyClient } from "./fixtures";

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

describe("useAuiState", () => {
  it("selects state and updates when the store notifies", () => {
    let aui!: AnyClient;
    let selected!: ComputedRef<number>;
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      selected = useAuiState((s) => (s as AnyClient).thread.selected);
    });

    expect(selected.value).toBe(0);

    flushTapSync(() => aui.thread.setSelected(1));
    expect(selected.value).toBe(1);

    unmount();
  });

  it("updates through the real scheduler without a manual flush", async () => {
    let aui!: AnyClient;
    let selected!: ComputedRef<number>;
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      selected = useAuiState((s) => (s as AnyClient).thread.selected);
    });

    aui.thread.setSelected(1);
    // The tap scheduler flushes on a MessageChannel macrotask whose ordering
    // against timers is unspecified; poll instead of racing a single timer
    await vi.waitFor(() => {
      expect(selected.value).toBe(1);
    });

    unmount();
  });

  it("re-runs watchers only when the slice changes by Object.is", async () => {
    let aui!: AnyClient;
    let id!: ComputedRef<string>;
    const watcher = vi.fn();
    const { unmount } = mountWithProvider(() => {
      aui = useAui() as AnyClient;
      id = useAuiState((s) => (s as AnyClient).message.id);
      watch(id, watcher);
    });

    flushTapSync(() => aui.thread.message({ index: 0 }).setText("hello"));
    await nextTick();
    expect(watcher).not.toHaveBeenCalled();

    flushTapSync(() => aui.thread.setSelected(1));
    await nextTick();
    expect(watcher).toHaveBeenCalledTimes(1);
    expect(id.value).toBe("m1");

    unmount();
  });

  it("throws when the selector returns the whole state", () => {
    let state!: ComputedRef<unknown>;
    const { unmount } = mountWithProvider(() => {
      state = useAuiState((s) => s);
    });

    expect(() => state.value).toThrow(
      "You tried to return the entire AssistantState.",
    );

    unmount();
  });

  it("resolves unavailable scopes to undefined via optional", () => {
    let missing!: ComputedRef<unknown>;
    const { unmount } = mountWithProvider(() => {
      missing = useAuiState((s) => (s.optional as AnyClient).missing);
    });

    expect(missing.value).toBeUndefined();

    unmount();
  });
});
