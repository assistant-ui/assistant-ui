import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { provideAui } from "../provideAui";
import { useAuiState } from "../useAuiState";
import {
  actionBarCopy,
  actionBarEdit,
  actionBarReload,
} from "../primitives/actionBar";
import { composerInput, composerSend } from "../primitives/composer";
import { threadMessages, type MessageItem } from "../primitives/threadMessages";
import Host from "./fixtures/Host.svelte";
import { createEchoRuntime, flushEvents, type AnyClient } from "./clients";

const target = () => document.createElement("div");

const mountThread = (
  seed: { id: string; role: "user" | "assistant"; text: string }[],
) => {
  const echo = createEchoRuntime();
  echo.setMessages(seed);
  let messages!: ReturnType<typeof threadMessages>;
  const app = mount(Host, {
    target: target(),
    props: {
      setup: () => {
        provideAui(AuiConfig({ threads: RuntimeAdapter(echo.runtime) }));
        messages = threadMessages();
      },
    },
  });
  return { app, echo, messages: () => messages };
};

describe("action bar builders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("edit begins the item's edit composer and disables while editing", () => {
    const { app, messages } = mountThread([
      { id: "u0", role: "user", text: "original" },
    ]);
    const item = messages().item(0);
    const edit = actionBarEdit({ item });
    const input = composerInput({ item });

    expect(edit.props.disabled).toBe(false);
    flushTapSync(() => edit.props.onclick());
    expect(edit.props.disabled).toBe(true);
    expect(input.props.value).toBe("original");

    flushTapSync(() => edit.props.onclick());
    expect(input.props.value).toBe("original");

    flushSync(() => void unmount(app));
  });

  it("reload regenerates an assistant message and stays disabled for user rows", async () => {
    const { app, echo, messages } = mountThread([
      { id: "u0", role: "user", text: "hi" },
      { id: "a0", role: "assistant", text: "reply" },
    ]);
    const userReload = actionBarReload({ item: messages().item(0) });
    const assistantItem = messages().item(1);
    assistantItem.source.subscribe(() => {});
    const assistantReload = actionBarReload({ item: assistantItem });

    expect(userReload.props.disabled).toBe(true);
    userReload.props.onclick();
    expect(echo.onReload).not.toHaveBeenCalled();

    expect(assistantReload.props.disabled).toBe(false);
    assistantReload.props.onclick();
    await flushEvents();
    expect(echo.onReload).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(
        useAuiState((s) => (s.message.content[0] as AnyClient).text, {
          item: assistantItem,
        }).current,
      ).toBe("regenerated"),
    );

    flushSync(() => void unmount(app));
  });

  it("copy writes the message text and opens a bounded isCopied window", async () => {
    const { app, messages } = mountThread([
      { id: "u0", role: "user", text: "hi" },
      { id: "a0", role: "assistant", text: "reply" },
    ]);
    const item = messages().item(1);
    const copyToClipboard = vi.fn(async () => {});
    const copy = actionBarCopy({ item, copiedDuration: 300, copyToClipboard });

    expect(copy.props.disabled).toBe(false);
    copy.props.onclick();
    await vi.waitFor(() => expect(copy.isCopied).toBe(true));
    expect(copyToClipboard).toHaveBeenCalledWith("reply");

    await vi.waitFor(() => expect(copy.isCopied).toBe(false), {
      timeout: 2000,
    });

    flushSync(() => void unmount(app));
  });

  it("a late clipboard completion does not mark a replaced slot occupant", async () => {
    const { app, echo, messages } = mountThread([
      { id: "u0", role: "user", text: "hi" },
      { id: "a0", role: "assistant", text: "reply" },
    ]);
    const item = messages().item(1);
    let resolveWrite!: () => void;
    const copyToClipboard = vi.fn(
      () => new Promise<void>((resolve) => (resolveWrite = resolve)),
    );
    const copy = actionBarCopy({ item, copyToClipboard });

    copy.props.onclick();
    // The slot occupant changes before the clipboard write settles
    flushTapSync(() =>
      echo.setMessages([
        { id: "u0", role: "user", text: "hi" },
        { id: "a9", role: "assistant", text: "different" },
      ]),
    );
    resolveWrite();
    await flushEvents();
    await flushEvents();
    expect(copy.isCopied).toBe(false);

    flushSync(() => void unmount(app));
  });

  it("copy while editing copies the edit composer draft", async () => {
    const { app, messages } = mountThread([
      { id: "u0", role: "user", text: "original" },
    ]);
    const item = messages().item(0);
    const copyToClipboard = vi.fn(async () => {});
    const copy = actionBarCopy({ item, copyToClipboard });

    flushTapSync(() => item.aui.composer.beginEdit());
    const textarea = document.createElement("textarea");
    textarea.value = "draft edit";
    composerInput({ item }).props.oninput({
      target: textarea,
    } as unknown as Event);

    copy.props.onclick();
    await vi.waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith("draft edit"),
    );

    flushSync(() => void unmount(app));
  });

  it("destroy invalidates pending copies and clears the copied timer", async () => {
    const echo = createEchoRuntime();
    echo.setMessages([
      { id: "u0", role: "user", text: "hi" },
      { id: "a0", role: "assistant", text: "reply" },
    ]);
    let copy!: ReturnType<typeof actionBarCopy>;
    let item!: MessageItem;
    let resolveWrite!: () => void;
    const copyToClipboard = vi.fn(
      () => new Promise<void>((resolve) => (resolveWrite = resolve)),
    );
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ threads: RuntimeAdapter(echo.runtime) }));
          const messages = threadMessages();
          item = messages.item(1);
          item.source.subscribe(() => {});
          copy = actionBarCopy({ item, copyToClipboard });
        },
      },
    });

    // A clipboard write pending across destroy must not mark the message
    copy.props.onclick();
    flushSync(() => void unmount(app));
    resolveWrite();
    await flushEvents();
    await flushEvents();
    expect((item.aui as AnyClient).message.getState().isCopied).toBe(false);
  });

  it("destroy during the copied window clears the timer and resets state", async () => {
    const echo = createEchoRuntime();
    echo.setMessages([
      { id: "u0", role: "user", text: "hi" },
      { id: "a0", role: "assistant", text: "reply" },
    ]);
    let copy!: ReturnType<typeof actionBarCopy>;
    let item!: MessageItem;
    const app = mount(Host, {
      target: target(),
      props: {
        setup: () => {
          provideAui(AuiConfig({ threads: RuntimeAdapter(echo.runtime) }));
          const messages = threadMessages();
          item = messages.item(1);
          item.source.subscribe(() => {});
          copy = actionBarCopy({
            item,
            copiedDuration: 60_000,
            copyToClipboard: vi.fn(async () => {}),
          });
        },
      },
    });

    copy.props.onclick();
    await vi.waitFor(() =>
      expect((item.aui as AnyClient).message.getState().isCopied).toBe(true),
    );
    flushSync(() => void unmount(app));
    expect((item.aui as AnyClient).message.getState().isCopied).toBe(false);
  });
});

describe("branch flow through the builders", () => {
  it("editing a user message creates a sibling branch navigable by the pickers", async () => {
    const { app, messages } = mountThread([
      { id: "u0", role: "user", text: "first" },
    ]);
    const item = messages().item(0);
    item.source.subscribe(() => {});
    const edit = actionBarEdit({ item });
    const input = composerInput({ item });
    const send = composerSend({ item });
    const branchNumber = useAuiState((s) => s.message.branchNumber, { item });
    const branchCount = useAuiState((s) => s.message.branchCount, { item });

    flushTapSync(() => edit.props.onclick());
    const textarea = document.createElement("textarea");
    textarea.value = "second";
    input.props.oninput({ target: textarea } as unknown as Event);
    flushTapSync(() => send.props.onclick());
    await vi.waitFor(() => expect(branchCount.current).toBe(2));
    expect(branchNumber.current).toBe(2);

    const { branchPickerPrevious, branchPickerNext } =
      await import("../primitives/branchPicker");
    const previous = branchPickerPrevious({ item });
    const next = branchPickerNext({ item });

    expect(next.props.disabled).toBe(true);
    expect(previous.props.disabled).toBe(false);

    flushTapSync(() => previous.props.onclick());
    await vi.waitFor(() => expect(branchNumber.current).toBe(1));
    expect(
      useAuiState((s) => (s.message.content[0] as AnyClient).text, { item })
        .current,
    ).toBe("first");
    expect(previous.props.disabled).toBe(true);
    expect(next.props.disabled).toBe(false);

    flushTapSync(() => next.props.onclick());
    await vi.waitFor(() => expect(branchNumber.current).toBe(2));

    flushSync(() => void unmount(app));
  });
});
