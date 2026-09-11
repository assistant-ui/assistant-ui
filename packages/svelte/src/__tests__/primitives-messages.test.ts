import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { provideAui } from "../provideAui";
import { useAuiState } from "../useAuiState";
import { composerInput, composerSend } from "../primitives/composer";
import { threadMessages } from "../primitives/threadMessages";
import Host from "./fixtures/Host.svelte";
import StateProbe from "./fixtures/StateProbe.svelte";
import { createEchoRuntime, flushEvents, type AnyClient } from "./clients";

const target = () => document.createElement("div");

describe("threadMessages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the live message list and cached per-index items", async () => {
    let aui!: AnyClient;
    let messages!: ReturnType<typeof threadMessages>;
    const echo = createEchoRuntime();
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          aui = provideAui(
            AuiConfig({ threads: RuntimeAdapter(echo.runtime) }),
          ) as AnyClient;
          messages = threadMessages();
        },
      },
    });

    expect(messages.items).toHaveLength(0);

    flushTapSync(() => aui.composer.setText("hello"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => expect(messages.items).toHaveLength(1));
    expect(messages.items[0]!.role).toBe("user");

    const item = messages.item(0);
    expect(messages.item(0)).toBe(item);
    expect(useAuiState((s) => s.message.role, { item }).current).toBe("user");
    expect(
      useAuiState((s) => (s.message.content[0] as AnyClient).text, { item })
        .current,
    ).toBe("hello");

    flushSync(() => void unmount(app));
  });

  it("edits a message through the item's edit composer builders", async () => {
    let messages!: ReturnType<typeof threadMessages>;
    const echo = createEchoRuntime();
    echo.setMessages([{ id: "u0", role: "user", text: "original" }]);
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ threads: RuntimeAdapter(echo.runtime) }));
          messages = threadMessages();
        },
      },
    });

    const item = messages.item(0);
    item.source.subscribe(() => {});
    const input = composerInput({ item });
    const send = composerSend({ item });

    // Before beginEdit the edit composer rejects typing and stays empty
    const textarea = document.createElement("textarea");
    textarea.value = "typed";
    input.props.oninput({ target: textarea } as unknown as Event);
    expect(textarea.value).toBe("");
    expect(input.props.value).toBe("");

    flushTapSync(() => item.aui.composer.beginEdit());
    expect(input.props.value).toBe("original");

    textarea.value = "edited";
    input.props.oninput({ target: textarea } as unknown as Event);
    expect(input.props.value).toBe("edited");

    send.props.onclick();
    await flushEvents();
    expect(echo.onEdit).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(
        useAuiState((s) => (s.message.content[0] as AnyClient).text, { item })
          .current,
      ).toBe("edited"),
    );

    flushSync(() => void unmount(app));
  });

  it("serves the last valid item through a shrink and reports once settled", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let messages!: ReturnType<typeof threadMessages>;
    const echo = createEchoRuntime();
    echo.setMessages([
      { id: "u0", role: "user", text: "first" },
      { id: "u1", role: "user", text: "second" },
    ]);
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ threads: RuntimeAdapter(echo.runtime) }));
          messages = threadMessages();
          const text = useAuiState(
            (s) => (s.message.content[0] as AnyClient).text,
            { item: messages.item(1) },
          );
          return () => text.current;
        },
        onValue,
      },
    });

    await vi.waitFor(() => expect(onValue).toHaveBeenCalledWith("second"));

    flushTapSync(() =>
      echo.setMessages([{ id: "u0", role: "user", text: "first" }]),
    );
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(String(errorSpy.mock.calls[0]![0])).toContain("index 1");

    // A never-valid index resolves at first read and throws immediately
    expect(
      () =>
        useAuiState((s) => s.message.role, { item: messages.item(5) }).current,
    ).toThrow();

    flushSync(() => void unmount(app));
  });
  it("stays quiet on a shrink with no remaining observers", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let messages!: ReturnType<typeof threadMessages>;
    const echo = createEchoRuntime();
    echo.setMessages([
      { id: "u0", role: "user", text: "first" },
      { id: "u1", role: "user", text: "second" },
    ]);
    const onValue = vi.fn();
    const app = mount(StateProbe, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ threads: RuntimeAdapter(echo.runtime) }));
          messages = threadMessages();
          const text = useAuiState(
            (s) => (s.message.content[0] as AnyClient).text,
            { item: messages.item(1) },
          );
          return () => text.current;
        },
        onValue,
      },
    });
    await vi.waitFor(() => expect(onValue).toHaveBeenCalledWith("second"));

    // Release every observer before the shrink; the suspended item must not
    // report a stale scope for a row nobody reads
    flushSync(() => void unmount(app));
    flushTapSync(() =>
      echo.setMessages([{ id: "u0", role: "user", text: "first" }]),
    );
    await flushEvents();
    await flushEvents();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
