import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createComponent,
  createEffect,
  createSignal,
  Show,
  type JSX,
} from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { MessagePrimitiveParts } from "./MessagePrimitiveParts";
import { MessagePrimitiveRoot } from "./message";
import { ComposerPrimitiveInput } from "./ComposerPrimitiveInput";
import { ComposerPrimitiveSend } from "./ComposerPrimitiveSend";
import { ComposerPrimitiveCancel } from "./ComposerPrimitiveCancel";
import {
  ActionBarPrimitiveCopy,
  ActionBarPrimitiveEdit,
  ActionBarPrimitiveReload,
} from "./actionBar";
import {
  BranchPickerPrimitiveCount,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitivePrevious,
} from "./branchPicker";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: { type: "running" };
};

const conversation: readonly DemoMessage[] = [
  { id: "u1", role: "user", text: "hello" },
  { id: "a1", role: "assistant", text: "Echo: hello" },
];

const createEditableRuntime = (supportsEdit = true, supportsReload = true) => {
  let messages: readonly DemoMessage[] = [];
  let isRunning = false;
  let isDisabled = false;
  let nextId = 0;
  const onEdit = vi.fn(async (message: AppendMessage) => {
    const text = message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    messages = [
      { id: `user-${nextId++}`, role: "user", text },
      { id: `assistant-${nextId++}`, role: "assistant", text: `Echo: ${text}` },
    ];
    sync();
  });
  const onReload = vi.fn(async () => {
    messages = [
      ...messages.slice(0, -1),
      {
        id: `assistant-${nextId++}`,
        role: "assistant",
        text: `${messages.at(-1)!.text} (again)`,
      },
    ];
    sync();
  });
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning,
    isDisabled,
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
      ...(message.status && { status: message.status }),
    }),
    onNew: async () => {},
    setMessages: (next) => {
      messages = next;
      sync();
    },
    ...(supportsEdit && { onEdit }),
    ...(supportsReload && { onReload }),
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const sync = () => core.setAdapter(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    onEdit,
    onReload,
    seed: (next: readonly DemoMessage[]) => {
      messages = next;
      flushTapSync(sync);
    },
    setRunning: (value: boolean) => {
      isRunning = value;
      flushTapSync(sync);
    },
    setDisabled: (value: boolean) => {
      isDisabled = value;
      flushTapSync(sync);
    },
  };
};

const FirstMessage = (props: { children?: JSX.Element }) => {
  const aui = useAui();
  return createComponent(AuiProvider, {
    config: AuiConfig({
      message: Derived({
        source: "thread",
        query: { type: "index", index: 0 },
        get: (aui) => aui.thread.message({ index: 0 }),
      }),
      composer: Derived({
        source: "message",
        query: {},
        get: (aui) => aui.message.composer(),
      }),
    }),
    extends: aui,
    get children() {
      return props.children;
    },
  });
};

const MessageView = () => {
  const copied = useAuiState((s) => s.message.isCopied);
  const role = useAuiState((s) => s.message.role);
  return createComponent(MessagePrimitiveRoot, {
    class: "msg",
    get "data-role"() {
      return role();
    },
    get children() {
      return [
        createComponent(Dynamic, {
          component: "span",
          class: "probe",
          get children() {
            return String(copied());
          },
        }),
        createComponent(Dynamic, {
          component: "span",
          class: "text",
          get children() {
            return createComponent(MessagePrimitiveParts, {});
          },
        }),
        createComponent(ActionBarPrimitiveEdit, {
          class: "edit",
          children: "Edit",
        }),
        createComponent(ActionBarPrimitiveCopy, {
          class: "copy",
          copiedDuration: 300,
          children: "Copy",
        }),
        createComponent(ActionBarPrimitiveReload, {
          class: "reload",
          children: "Reload",
        }),
        createComponent(BranchPickerPrimitivePrevious, {
          class: "prev",
          children: "<",
        }),
        createComponent(Dynamic, {
          component: "span",
          class: "pos",
          get children() {
            return [
              createComponent(BranchPickerPrimitiveNumber, {}),
              "/",
              createComponent(BranchPickerPrimitiveCount, {}),
            ];
          },
        }),
        createComponent(BranchPickerPrimitiveNext, {
          class: "next",
          children: ">",
        }),
        createComponent(ComposerPrimitiveInput, { class: "editor" }),
        createComponent(ComposerPrimitiveSend, {
          class: "send",
          children: "Save",
        }),
        createComponent(ComposerPrimitiveCancel, {
          class: "cancel",
          children: "Discard",
        }),
      ];
    },
  });
};

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "clipboard");
});

const mountChat = (
  runtime: AssistantRuntimeImpl,
  messages = ThreadPrimitiveMessages,
  view: () => JSX.Element = MessageView,
) => {
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(messages, {
            get children() {
              return createComponent(view, {});
            },
          });
        },
      }),
    el,
  );
  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    dispose();
    el.remove();
  };
  disposers.push(unmount);
  return { el, unmount };
};

const userItem = (el: HTMLElement) =>
  el.querySelector<HTMLElement>('[data-role="user"]')!;
const assistantItem = (el: HTMLElement) =>
  el.querySelector<HTMLElement>('[data-role="assistant"]')!;
const q = <T extends HTMLElement = HTMLElement>(
  scope: HTMLElement,
  selector: string,
) => scope.querySelector<T>(selector)!;
const input = (editor: HTMLTextAreaElement, text: string) => {
  editor.value = text;
  flushTapSync(() =>
    editor.dispatchEvent(new InputEvent("input", { bubbles: true })),
  );
};
const clipboard = (writeText = vi.fn(async () => {})) => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
};
const edit = async (el: HTMLElement, text = "goodbye") => {
  const user = userItem(el);
  flushTapSync(() => q(user, ".edit").click());
  expect(q<HTMLTextAreaElement>(user, ".editor").value).toBe("hello");
  expect(q<HTMLButtonElement>(user, ".edit").disabled).toBe(true);
  input(q(user, ".editor"), text);
  flushTapSync(() => q(user, ".send").click());
  await vi.waitFor(() =>
    expect(q(userItem(el), ".text").textContent).toBe(text),
  );
};

describe("action bar edit flow and branches", () => {
  it("edits a user message into a second branch and switches between them", async () => {
    const { runtime, seed, onEdit } = createEditableRuntime();
    const { el } = mountChat(runtime);
    expect(el.querySelectorAll(".msg")).toHaveLength(0);
    seed(conversation);
    expect(el.querySelectorAll(".msg")).toHaveLength(2);
    expect(q<HTMLTextAreaElement>(userItem(el), ".editor").value).toBe("");
    await edit(el);
    expect(onEdit.mock.calls[0]![0]).toMatchObject({
      sourceId: "u1",
      content: [{ type: "text", text: "goodbye" }],
    });
    expect(q(userItem(el), ".pos").textContent).toBe("2/2");
    expect(q(assistantItem(el), ".text").textContent).toBe("Echo: goodbye");
    expect(q<HTMLButtonElement>(userItem(el), ".next").disabled).toBe(true);
    expect(q<HTMLButtonElement>(userItem(el), ".prev").disabled).toBe(false);
    flushTapSync(() => q(userItem(el), ".prev").click());
    await vi.waitFor(() =>
      expect(q(userItem(el), ".text").textContent).toBe("hello"),
    );
    expect(q(userItem(el), ".pos").textContent).toBe("1/2");
    expect(q(assistantItem(el), ".text").textContent).toBe("Echo: hello");
    expect(q<HTMLButtonElement>(userItem(el), ".prev").disabled).toBe(true);
    flushTapSync(() => q(userItem(el), ".next").click());
    await vi.waitFor(() =>
      expect(q(userItem(el), ".text").textContent).toBe("goodbye"),
    );
    expect(q(assistantItem(el), ".text").textContent).toBe("Echo: goodbye");
  });

  it("blocks branch switching while a run is in flight", async () => {
    const { runtime, seed, setRunning } = createEditableRuntime();
    seed(conversation);
    const { el } = mountChat(runtime);
    await edit(el);
    expect(q(userItem(el), ".pos").textContent).toBe("2/2");
    setRunning(true);
    const previous = q<HTMLButtonElement>(userItem(el), ".prev");
    expect(previous.disabled).toBe(true);
    previous.disabled = false;
    flushTapSync(() => previous.click());
    expect(q(userItem(el), ".text").textContent).toBe("goodbye");
    setRunning(false);
    expect(previous.disabled).toBe(false);
  });

  it("discards an edit through the cancel button", () => {
    const { runtime, seed, onEdit } = createEditableRuntime();
    seed([conversation[0]!]);
    const { el } = mountChat(runtime);
    const user = userItem(el);
    flushTapSync(() => q(user, ".edit").click());
    expect(q<HTMLTextAreaElement>(user, ".editor").value).toBe("hello");
    input(q(user, ".editor"), "discard me");
    flushTapSync(() => q(user, ".cancel").click());
    expect(q<HTMLTextAreaElement>(user, ".editor").value).toBe("");
    expect(q<HTMLButtonElement>(user, ".edit").disabled).toBe(false);
    expect(q<HTMLButtonElement>(user, ".send").disabled).toBe(true);
    expect(q(user, ".text").textContent).toBe("hello");
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("reloads an assistant message into a second branch", async () => {
    const { runtime, seed, onReload } = createEditableRuntime();
    seed(conversation);
    const { el } = mountChat(runtime);
    const userReload = q<HTMLButtonElement>(userItem(el), ".reload");
    expect(userReload.disabled).toBe(true);
    userReload.disabled = false;
    flushTapSync(() => userReload.click());
    expect(onReload).not.toHaveBeenCalled();
    const reload = q<HTMLButtonElement>(assistantItem(el), ".reload");
    expect(reload.disabled).toBe(false);
    flushTapSync(() => reload.click());
    await vi.waitFor(() =>
      expect(q(assistantItem(el), ".text").textContent).toBe(
        "Echo: hello (again)",
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
    expect(q(assistantItem(el), ".pos").textContent).toBe("2/2");
    expect(q(userItem(el), ".text").textContent).toBe("hello");
  });
});

describe("ActionBarPrimitiveCopy", () => {
  it("drops a late copy completion after the branch under the index changes", async () => {
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    const writeText = clipboard(vi.fn(() => write));
    const { runtime, seed } = createEditableRuntime();
    seed(conversation);
    const { el } = mountChat(runtime, FirstMessage);
    const user = userItem(el);
    q(user, ".copy").click();
    expect(writeText).toHaveBeenCalledWith("hello");
    await edit(el);
    expect(userItem(el)).toBe(user);
    resolveWrite();
    await write;
    expect(q(user, ".copy").hasAttribute("data-copied")).toBe(false);
    expect(q(user, ".probe").textContent).toBe("false");
  });

  it("clears copy feedback after the message moves out of an index scope", async () => {
    clipboard();
    const original: DemoMessage = {
      id: "a1",
      role: "assistant",
      text: "reply",
    };
    const { runtime, seed } = createEditableRuntime();
    seed([original]);
    const { el } = mountChat(runtime, FirstMessage);
    const copy = q<HTMLButtonElement>(assistantItem(el), ".copy");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    copy.click();
    await Promise.resolve();
    expect(copy.hasAttribute("data-copied")).toBe(true);
    seed([{ id: "older", role: "user", text: "earlier question" }, original]);
    expect(q(userItem(el), ".copy")).toBe(copy);
    expect(copy.hasAttribute("data-copied")).toBe(false);
    vi.advanceTimersByTime(300);
    seed([original]);
    expect(q(assistantItem(el), ".copy")).toBe(copy);
    expect(copy.hasAttribute("data-copied")).toBe(false);
  });

  it.each(["unavailable", "rejected"])(
    "stays inert when clipboard writing is %s",
    async (failure) => {
      if (failure === "unavailable")
        Reflect.deleteProperty(navigator, "clipboard");
      else
        clipboard(vi.fn(() => Promise.reject(new Error("Permission denied"))));
      const { runtime, seed } = createEditableRuntime();
      seed(conversation);
      const { el } = mountChat(runtime);
      const copy = q<HTMLButtonElement>(assistantItem(el), ".copy");
      expect(() => copy.click()).not.toThrow();
      await Promise.resolve();
      expect(copy.hasAttribute("data-copied")).toBe(false);
      expect(q(assistantItem(el), ".probe").textContent).toBe("false");
    },
  );

  it("copies message text and flags data-copied for the configured window", async () => {
    const writeText = clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed(conversation);
    const { el } = mountChat(runtime);
    const copy = q<HTMLButtonElement>(assistantItem(el), ".copy");
    expect(copy.disabled).toBe(false);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    copy.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("Echo: hello");
    expect(q(assistantItem(el), ".probe").textContent).toBe("true");
    expect(copy.getAttribute("data-copied")).toBe("");
    vi.advanceTimersByTime(299);
    expect(copy.hasAttribute("data-copied")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(q(assistantItem(el), ".probe").textContent).toBe("false");
    expect(copy.hasAttribute("data-copied")).toBe(false);
  });

  it("copies the edit composer text and ignores an empty edit", async () => {
    const writeText = clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed([conversation[0]!]);
    const { el } = mountChat(runtime);
    const user = userItem(el);
    flushTapSync(() => q(user, ".edit").click());
    input(q(user, ".editor"), "edited draft");
    q(user, ".copy").click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledExactlyOnceWith("edited draft");
    input(q(user, ".editor"), "");
    q(user, ".copy").click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledOnce();
  });

  it("disables copy for empty text and a running assistant message", () => {
    const writeText = clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed([
      { id: "u1", role: "user", text: "" },
      {
        id: "a1",
        role: "assistant",
        text: "streaming",
        status: { type: "running" },
      },
    ]);
    const { el } = mountChat(runtime);
    for (const copy of el.querySelectorAll<HTMLButtonElement>(".copy")) {
      expect(copy.disabled).toBe(true);
      copy.disabled = false;
      copy.click();
    }
    expect(writeText).not.toHaveBeenCalled();
  });

  it("restarts feedback with the live duration and consumes its prop", async () => {
    clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed([conversation[0]!]);
    const [duration, setDuration] = createSignal(300);
    const { el } = mountChat(runtime, FirstMessage, () =>
      createComponent(ActionBarPrimitiveCopy, {
        get copiedDuration() {
          return duration();
        },
      }),
    );
    const copy = q<HTMLButtonElement>(el, "button");
    expect(copy.hasAttribute("copiedDuration")).toBe(false);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    copy.click();
    await Promise.resolve();
    vi.advanceTimersByTime(299);
    expect(copy.hasAttribute("data-copied")).toBe(true);
    setDuration(100);
    copy.click();
    await Promise.resolve();
    vi.advanceTimersByTime(1);
    expect(copy.hasAttribute("data-copied")).toBe(true);
    vi.advanceTimersByTime(99);
    expect(copy.hasAttribute("data-copied")).toBe(false);
  });

  it("drops a clipboard completion after unmount", async () => {
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    clipboard(vi.fn(() => write));
    const { runtime, seed } = createEditableRuntime();
    seed([conversation[0]!]);
    const [visible, setVisible] = createSignal(true);
    let copied!: () => boolean;
    const { el } = mountChat(runtime, FirstMessage, () => {
      copied = useAuiState((s) => s.message.isCopied);
      return createComponent(Show, {
        keyed: true,
        get when() {
          return visible();
        },
        get children() {
          return createComponent(ActionBarPrimitiveCopy, {});
        },
      });
    });
    q(el, "button").click();
    setVisible(false);
    resolveWrite();
    await write;
    expect(copied()).toBe(false);
    expect(el.querySelector("button")).toBeNull();
  });

  it("uses a 3000 millisecond feedback window by default", async () => {
    clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed([conversation[0]!]);
    const { el } = mountChat(runtime, FirstMessage, () =>
      createComponent(ActionBarPrimitiveCopy, {}),
    );
    const copy = q<HTMLButtonElement>(el, "button");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    copy.click();
    await Promise.resolve();
    vi.advanceTimersByTime(2999);
    expect(copy.hasAttribute("data-copied")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(copy.hasAttribute("data-copied")).toBe(false);
  });

  it("does not schedule feedback after a copied-state observer unmounts the button", async () => {
    clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed([conversation[0]!]);
    const [visible, setVisible] = createSignal(true);
    let copied!: () => boolean;
    const { el } = mountChat(runtime, FirstMessage, () => {
      copied = useAuiState((s) => s.message.isCopied);
      createEffect(() => {
        if (copied()) setVisible(false);
      });
      return createComponent(Show, {
        keyed: true,
        get when() {
          return visible();
        },
        get children() {
          return createComponent(ActionBarPrimitiveCopy, {});
        },
      });
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    q(el, "button").click();
    await Promise.resolve();
    expect(el.querySelector("button")).toBeNull();
    expect(copied()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears active feedback and its timer on unmount", async () => {
    clipboard();
    const { runtime, seed } = createEditableRuntime();
    seed([conversation[0]!]);
    const [visible, setVisible] = createSignal(true);
    let copied!: () => boolean;
    const { el } = mountChat(runtime, FirstMessage, () => {
      copied = useAuiState((s) => s.message.isCopied);
      return createComponent(Show, {
        keyed: true,
        get when() {
          return visible();
        },
        get children() {
          return createComponent(ActionBarPrimitiveCopy, {});
        },
      });
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    q(el, "button").click();
    await Promise.resolve();
    expect(copied()).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    setVisible(false);
    expect(copied()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("action bar button contracts", () => {
  const actions = [
    { name: "edit", Component: ActionBarPrimitiveEdit },
    { name: "reload", Component: ActionBarPrimitiveReload },
    { name: "copy", Component: ActionBarPrimitiveCopy },
  ] as const;

  it.each(actions)(
    "forwards refs and reactive children and attributes ($name)",
    ({ Component }) => {
      const { runtime, seed } = createEditableRuntime();
      seed([conversation[1]!]);
      const [label, setLabel] = createSignal("Action");
      const ref = vi.fn();
      const { el } = mountChat(runtime, FirstMessage, () =>
        createComponent(Component, {
          ref,
          class: "action",
          get "aria-label"() {
            return label();
          },
          get children() {
            return label();
          },
        }),
      );
      const button = q<HTMLButtonElement>(el, "button");
      expect(button.type).toBe("button");
      expect(button.className).toBe("action");
      expect(button.textContent).toBe("Action");
      expect(ref.mock.calls[0]![0]).toBe(button);
      setLabel("Updated action");
      expect(button.textContent).toBe("Updated action");
      expect(button.getAttribute("aria-label")).toBe("Updated action");
    },
  );

  it.each(actions)(
    "honors live disabled props after the DOM is forcibly enabled ($name)",
    async ({ Component }) => {
      const writeText = clipboard();
      const { runtime, seed, onReload } = createEditableRuntime();
      seed([conversation[1]!]);
      const [disabled, setDisabled] = createSignal(true);
      let editing!: () => boolean;
      const { el } = mountChat(runtime, FirstMessage, () => {
        editing = useAuiState((s) => s.composer.isEditing);
        return createComponent(Component, {
          get disabled() {
            return disabled();
          },
        });
      });
      const button = q<HTMLButtonElement>(el, "button");
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
      expect(editing()).toBe(false);
      expect(onReload).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      setDisabled(false);
      expect(button.disabled).toBe(false);
      flushTapSync(() => button.click());
      await vi.waitFor(() => {
        expect(editing()).toBe(Component === ActionBarPrimitiveEdit);
        expect(onReload).toHaveBeenCalledTimes(
          Component === ActionBarPrimitiveReload ? 1 : 0,
        );
        expect(writeText).toHaveBeenCalledTimes(
          Component === ActionBarPrimitiveCopy ? 1 : 0,
        );
      });
    },
  );

  it.each(
    actions.flatMap((action) =>
      [false, true].map((bound) => ({ ...action, bound })),
    ),
  )(
    "runs the caller first and honors a click veto ($name, bound=$bound)",
    async ({ Component, bound }) => {
      const writeText = clipboard();
      const { runtime, seed, onReload } = createEditableRuntime();
      seed([conversation[1]!]);
      const [veto, setVeto] = createSignal(true);
      let editing!: () => boolean;
      const handler = vi.fn((event: MouseEvent) => {
        expect(editing()).toBe(false);
        expect(onReload).not.toHaveBeenCalled();
        expect(writeText).not.toHaveBeenCalled();
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const { el } = mountChat(runtime, FirstMessage, () => {
        editing = useAuiState((s) => s.composer.isEditing);
        return createComponent(Component, {
          onClick: bound ? [boundHandler, "caller"] : handler,
        });
      });
      const button = q<HTMLButtonElement>(el, "button");
      flushTapSync(() => button.click());
      expect(handler).toHaveBeenCalledOnce();
      expect(editing()).toBe(false);
      expect(onReload).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      setVeto(false);
      flushTapSync(() => button.click());
      await vi.waitFor(() => {
        expect(editing()).toBe(Component === ActionBarPrimitiveEdit);
        expect(onReload).toHaveBeenCalledTimes(
          Component === ActionBarPrimitiveReload ? 1 : 0,
        );
        expect(writeText).toHaveBeenCalledTimes(
          Component === ActionBarPrimitiveCopy ? 1 : 0,
        );
      });
    },
  );

  it.each(actions)(
    "keeps the caller delegated after descendant handlers ($name)",
    ({ Component }) => {
      const writeText = clipboard();
      const { runtime, seed, onReload } = createEditableRuntime();
      seed([conversation[1]!]);
      const order: string[] = [];
      let editing!: () => boolean;
      const { el } = mountChat(runtime, FirstMessage, () => {
        editing = useAuiState((s) => s.composer.isEditing);
        return createComponent(Component, {
          onClick: (event) => {
            order.push(event.defaultPrevented ? "caller:prevented" : "caller");
          },
          get children() {
            return createComponent(Dynamic, {
              component: "span",
              children: "Action",
              onClick: (event: MouseEvent) => {
                order.push("child");
                event.preventDefault();
              },
            });
          },
        });
      });
      flushTapSync(() => q(el, "span").click());
      expect(order).toEqual(["child", "caller:prevented"]);
      expect(editing()).toBe(false);
      expect(onReload).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
    },
  );

  it("blocks edit and reload on a disabled thread, and reload during a run", () => {
    const { runtime, seed, setDisabled, setRunning, onReload } =
      createEditableRuntime();
    seed(conversation);
    const { el } = mountChat(runtime);
    setDisabled(true);
    const editButton = q<HTMLButtonElement>(userItem(el), ".edit");
    const reload = q<HTMLButtonElement>(assistantItem(el), ".reload");
    expect(editButton.disabled).toBe(true);
    expect(reload.disabled).toBe(true);
    editButton.disabled = reload.disabled = false;
    flushTapSync(() => {
      editButton.click();
      reload.click();
    });
    expect(q<HTMLTextAreaElement>(userItem(el), ".editor").value).toBe("");
    expect(onReload).not.toHaveBeenCalled();
    setDisabled(false);
    expect(editButton.disabled).toBe(false);
    expect(reload.disabled).toBe(false);
    setRunning(true);
    expect(reload.disabled).toBe(true);
    reload.disabled = false;
    flushTapSync(() => reload.click());
    expect(onReload).not.toHaveBeenCalled();
    setRunning(false);
    expect(reload.disabled).toBe(false);
  });

  it("keeps unsupported edit and reload disabled even with disabled=false", () => {
    const { runtime, seed, onEdit, onReload } = createEditableRuntime(
      false,
      false,
    );
    seed(conversation);
    const { el } = mountChat(runtime, ThreadPrimitiveMessages, () => [
      createComponent(ActionBarPrimitiveEdit, {
        class: "edit",
        disabled: false,
      }),
      createComponent(ActionBarPrimitiveReload, {
        class: "reload",
        disabled: false,
      }),
    ]);
    for (const button of el.querySelectorAll("button")) {
      expect(button.disabled).toBe(true);
      button.disabled = false;
      flushTapSync(() => button.click());
    }
    expect(onEdit).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
    expect(
      runtime.thread.getMessageByIndex(0).composer.getState().isEditing,
    ).toBe(false);
  });
});
