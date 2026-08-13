import { describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { provideAui } from "../provideAui";
import { useAuiState } from "../useAuiState";
import Host from "./fixtures/Host.svelte";
import StateProbe from "./fixtures/StateProbe.svelte";
import { ThreadClient, type AnyClient } from "./clients";

const target = () => document.createElement("div");

describe("useAuiState", () => {
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
