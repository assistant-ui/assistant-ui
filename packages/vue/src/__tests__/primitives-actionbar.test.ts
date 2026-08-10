import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { ComposerPrimitiveInput } from "../primitives/ComposerPrimitiveInput";
import { ComposerPrimitiveSend } from "../primitives/ComposerPrimitiveSend";
import { ComposerPrimitiveCancel } from "../primitives/ComposerPrimitiveCancel";
import {
  ActionBarPrimitiveCopy,
  ActionBarPrimitiveEdit,
  ActionBarPrimitiveReload,
} from "../primitives/actionBar";
import {
  BranchPickerPrimitiveCount,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitivePrevious,
} from "../primitives/branchPicker";

afterEach(() => {
  vi.restoreAllMocks();
  // vi.restoreAllMocks does not undo hand-installed property descriptors.
  Reflect.deleteProperty(navigator, "clipboard");
});

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

const convertDemoMessage = (message: DemoMessage) => ({
  id: message.id,
  role: message.role,
  content: [{ type: "text" as const, text: message.text }],
});

let nextId = 0;
const freshId = (prefix: string) => `${prefix}-${nextId++}`;

const createEditableRuntime = () => {
  let messages: DemoMessage[] = [];
  let isRunning = false;
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning,
    convertMessage: convertDemoMessage,
    onNew: async () => {},
    setMessages: (next) => {
      messages = next;
      sync();
    },
    onEdit: async (message) => {
      const text = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");
      messages = [
        { id: freshId("user"), role: "user", text },
        { id: freshId("assistant"), role: "assistant", text: `Echo: ${text}` },
      ];
      sync();
    },
    onReload: async () => {
      messages = [
        ...messages.slice(0, -1),
        {
          id: freshId("assistant"),
          role: "assistant",
          text: `${messages.at(-1)!.text} (again)`,
        },
      ];
      sync();
    },
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeAdapter());
  const seed = (next: DemoMessage[]) => {
    messages = next;
    sync();
  };
  const setRunning = (value: boolean) => {
    isRunning = value;
    sync();
  };
  return { runtime, seed, setRunning };
};

const MessageView = defineComponent({
  setup() {
    const role = useAuiState((s) => s.message.role);
    const text = useAuiState((s) => {
      const part = s.message.content[0];
      return part?.type === "text" ? part.text : "";
    });
    const copiedProbe = useAuiState((s) => s.message.isCopied);
    return () =>
      h("li", { class: "msg", "data-role": role.value }, [
        h("span", { class: "probe" }, String(copiedProbe.value)),
        h("span", { class: "text" }, text.value),
        h(ActionBarPrimitiveEdit, { class: "edit" }, { default: () => "Edit" }),
        h(
          ActionBarPrimitiveCopy,
          { class: "copy", copiedDuration: 300 },
          {
            default: () => "Copy",
          },
        ),
        h(
          ActionBarPrimitiveReload,
          { class: "reload" },
          { default: () => "Reload" },
        ),
        h(
          BranchPickerPrimitivePrevious,
          { class: "prev" },
          { default: () => "<" },
        ),
        h("span", { class: "pos" }, [
          h(BranchPickerPrimitiveNumber),
          "/",
          h(BranchPickerPrimitiveCount),
        ]),
        h(BranchPickerPrimitiveNext, { class: "next" }, { default: () => ">" }),
        h(ComposerPrimitiveInput, { class: "editor" }),
        h(ComposerPrimitiveSend, { class: "send" }, { default: () => "Save" }),
        h(
          ComposerPrimitiveCancel,
          { class: "cancel" },
          { default: () => "Discard" },
        ),
      ]);
  },
});

const mountChat = (runtime: AssistantRuntimeImpl, view?: Component) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h(view ?? MessageView),
              }),
          },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

const userItem = (el: HTMLElement) =>
  el.querySelector<HTMLElement>('li[data-role="user"]')!;
const assistantItem = (el: HTMLElement) =>
  el.querySelector<HTMLElement>('li[data-role="assistant"]')!;
const q = <T extends HTMLElement>(scope: HTMLElement, selector: string) =>
  scope.querySelector<T>(selector)!;

describe("edit flow and branches", () => {
  it("edits a user message into a second branch and switches between them", async () => {
    const { runtime, seed } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Echo: hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    const user = userItem(el);
    expect(q<HTMLTextAreaElement>(user, "textarea.editor").value).toBe("");

    q(user, "button.edit").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q<HTMLTextAreaElement>(user, "textarea.editor").value).toBe(
        "hello",
      );
    });
    expect(q<HTMLButtonElement>(user, "button.edit").disabled).toBe(true);

    const editor = q<HTMLTextAreaElement>(user, "textarea.editor");
    editor.value = "goodbye";
    flushTapSync(() => editor.dispatchEvent(new Event("input")));
    q(user, "button.send").click();

    await vi.waitFor(async () => {
      await nextTick();
      expect(q(userItem(el), "span.text").textContent).toBe("goodbye");
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(q(userItem(el), "span.pos").textContent).toBe("2/2");
    });
    expect(q(assistantItem(el), "span.text").textContent).toBe("Echo: goodbye");

    const prev = q<HTMLButtonElement>(userItem(el), "button.prev");
    expect(prev.disabled).toBe(false);
    expect(q<HTMLButtonElement>(userItem(el), "button.next").disabled).toBe(
      true,
    );

    prev.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q(userItem(el), "span.text").textContent).toBe("hello");
    });
    expect(q(userItem(el), "span.pos").textContent).toBe("1/2");

    q<HTMLButtonElement>(userItem(el), "button.next").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q(userItem(el), "span.text").textContent).toBe("goodbye");
    });

    unmount();
  });

  it("blocks branch switching while a run is in flight", async () => {
    const { runtime, seed, setRunning } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Echo: hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    const user = userItem(el);
    q(user, "button.edit").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q<HTMLTextAreaElement>(user, "textarea.editor").value).toBe(
        "hello",
      );
    });
    const editor = q<HTMLTextAreaElement>(user, "textarea.editor");
    editor.value = "goodbye";
    flushTapSync(() => editor.dispatchEvent(new Event("input")));
    q(user, "button.send").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q(userItem(el), "span.pos").textContent).toBe("2/2");
    });

    flushTapSync(() => setRunning(true));
    await vi.waitFor(async () => {
      await nextTick();
      expect(q<HTMLButtonElement>(userItem(el), "button.prev").disabled).toBe(
        true,
      );
    });

    unmount();
  });

  it("discards an edit through the cancel button", async () => {
    const { runtime, seed } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() => seed([{ id: "u1", role: "user", text: "hello" }]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(1);
    });

    const user = userItem(el);
    q(user, "button.edit").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q<HTMLTextAreaElement>(user, "textarea.editor").value).toBe(
        "hello",
      );
    });

    q(user, "button.cancel").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q<HTMLTextAreaElement>(user, "textarea.editor").value).toBe("");
    });
    expect(q<HTMLButtonElement>(user, "button.edit").disabled).toBe(false);
    expect(q(user, "span.text").textContent).toBe("hello");

    unmount();
  });

  it("reloads an assistant message into a second branch", async () => {
    const { runtime, seed } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Echo: hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    expect(q<HTMLButtonElement>(userItem(el), "button.reload").disabled).toBe(
      true,
    );
    const reload = q<HTMLButtonElement>(assistantItem(el), "button.reload");
    expect(reload.disabled).toBe(false);

    reload.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q(assistantItem(el), "span.text").textContent).toBe(
        "Echo: hello (again)",
      );
    });
    expect(q(assistantItem(el), "span.pos").textContent).toBe("2/2");

    unmount();
  });

  it("drops a late copy completion after the branch under the index changes", async () => {
    let resolveWrite!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        }),
    );
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { runtime, seed } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Echo: hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    const user = userItem(el);
    q(user, "button.copy").click();
    expect(writeText).toHaveBeenCalledWith("hello");

    q(user, "button.edit").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q<HTMLTextAreaElement>(user, "textarea.editor").value).toBe(
        "hello",
      );
    });
    const editor = q<HTMLTextAreaElement>(user, "textarea.editor");
    editor.value = "goodbye";
    flushTapSync(() => editor.dispatchEvent(new Event("input")));
    q(user, "button.send").click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(q(userItem(el), "span.text").textContent).toBe("goodbye");
    });

    resolveWrite();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(q(userItem(el), "button.copy").hasAttribute("data-copied")).toBe(
      false,
    );

    unmount();
  });

  it("stays inert when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const { runtime, seed } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Echo: hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    expect(() =>
      q<HTMLButtonElement>(assistantItem(el), "button.copy").click(),
    ).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(
      q(assistantItem(el), "button.copy").hasAttribute("data-copied"),
    ).toBe(false);

    unmount();
  });

  it("copies message text and flags data-copied for the configured window", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { runtime, seed } = createEditableRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hello" },
        { id: "a1", role: "assistant", text: "Echo: hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    const copy = q<HTMLButtonElement>(assistantItem(el), "button.copy");
    expect(copy.disabled).toBe(false);
    copy.click();

    await vi.waitFor(async () => {
      await nextTick();
      expect(writeText).toHaveBeenCalledWith("Echo: hello");
      expect(q(assistantItem(el), "span.probe").textContent).toBe("true");
      expect(
        q(assistantItem(el), "button.copy").hasAttribute("data-copied"),
      ).toBe(true);
    });

    await vi.waitFor(async () => {
      await nextTick();
      expect(
        q(assistantItem(el), "button.copy").hasAttribute("data-copied"),
      ).toBe(false);
    });

    unmount();
  });
});
