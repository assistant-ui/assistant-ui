import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
  AppendMessage,
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { ComposerPrimitiveInput } from "./ComposerPrimitiveInput";

const createTestRuntime = () => {
  let isRunning = false;
  let isDisabled = false;
  const onNew = vi.fn<(message: AppendMessage) => Promise<void>>(
    async () => {},
  );
  const makeAdapter = (): ExternalStoreAdapter<ThreadMessageLike> => ({
    messages: [
      { id: "u1", role: "user", content: [{ type: "text", text: "original" }] },
    ],
    isRunning,
    isDisabled,
    convertMessage: (message) => message,
    onNew,
    onEdit: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    onNew,
    setRunning: (value: boolean) => {
      isRunning = value;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
    setDisabled: (value: boolean) => {
      isDisabled = value;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const mountInput = (
  runtime: AssistantRuntimeImpl,
  props: Parameters<typeof ComposerPrimitiveInput>[0] = {},
  editingMessage = false,
) => {
  const el = document.createElement("div");
  document.body.append(el);
  const View = () => {
    const aui = useAui();
    if (!editingMessage) return createComponent(ComposerPrimitiveInput, props);
    return createComponent(AuiProvider, {
      config: AuiConfig({
        composer: Derived({
          source: "thread",
          query: {},
          get: (aui) => aui.thread.message({ index: 0 }).composer(),
        }),
      }),
      extends: aui,
      get children() {
        return createComponent(ComposerPrimitiveInput, props);
      },
    });
  };
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(View, {});
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return el.querySelector("textarea")!;
};

const input = (textarea: HTMLTextAreaElement, text: string) => {
  textarea.value = text;
  return textarea.dispatchEvent(
    new InputEvent("input", { bubbles: true, cancelable: true }),
  );
};

const keydown = (
  textarea: HTMLTextAreaElement,
  options: KeyboardEventInit = {},
) =>
  textarea.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );

describe("ComposerPrimitiveInput", () => {
  it("binds the composer text and submits on Enter", async () => {
    const { runtime, onNew } = createTestRuntime();
    const textarea = mountInput(runtime);
    const textChange = vi.fn();
    const off = runtime.thread.composer.unstable_on("textChange", textChange);
    disposers.push(off);

    input(textarea, "hello");
    expect(runtime.thread.composer.getState().text).toBe("hello");
    expect(textarea.value).toBe("hello");
    expect(textChange).toHaveBeenCalledWith({ text: "hello", origin: "user" });
    expect(keydown(textarea)).toBe(false);

    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
    });
    await vi.waitFor(() => expect(textarea.value).toBe(""));
  });

  it("follows external text changes while overriding a caller value", () => {
    const { runtime } = createTestRuntime();
    const textarea = mountInput(runtime, { value: "uncontrolled" });
    expect(textarea.value).toBe("");
    flushTapSync(() => runtime.thread.composer.setText("draft"));
    expect(textarea.value).toBe("draft");
    flushTapSync(() => runtime.thread.composer.setText(""));
    expect(textarea.value).toBe("");
  });

  it("preserves the browser's selection after typing in the middle of text", async () => {
    const { runtime } = createTestRuntime();
    const textarea = mountInput(runtime);
    flushTapSync(() => runtime.thread.composer.setText("hello world"));
    textarea.focus();
    textarea.setSelectionRange(5, 5);
    textarea.setRangeText("!", 5, 5, "end");
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);

    textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(textarea.value).toBe("hello! world");
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);
    await vi.waitFor(() =>
      expect(runtime.thread.composer.getState().text).toBe("hello! world"),
    );
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);
  });

  it("keeps Shift+Enter and IME composition as newlines", () => {
    const { runtime, onNew } = createTestRuntime();
    const textarea = mountInput(runtime);
    input(textarea, "hello");
    expect(keydown(textarea, { shiftKey: true })).toBe(true);
    expect(keydown(textarea, { isComposing: true })).toBe(true);
    expect(runtime.thread.composer.getState().text).toBe("hello");
    expect(onNew).not.toHaveBeenCalled();
  });

  it("does not submit on Safari's post-compositionend Enter", async () => {
    const { runtime, onNew } = createTestRuntime();
    const textarea = mountInput(runtime);
    textarea.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    textarea.value = "hello";
    textarea.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    );
    textarea.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "hello" }),
    );

    expect(keydown(textarea, { keyCode: 229, isComposing: false })).toBe(true);
    expect(runtime.thread.composer.getState().text).toBe("hello");
    expect(onNew).not.toHaveBeenCalled();
    expect(keydown(textarea, { keyCode: 13 })).toBe(false);
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
  });

  it("honors changes to submitOnEnter without forwarding it to the textarea", async () => {
    const { runtime, onNew } = createTestRuntime();
    const [submitOnEnter, setSubmitOnEnter] = createSignal(false);
    const textarea = mountInput(runtime, {
      get submitOnEnter() {
        return submitOnEnter();
      },
    });
    input(textarea, "hello");
    expect(keydown(textarea)).toBe(true);
    expect(runtime.thread.composer.getState().text).toBe("hello");
    expect(onNew).not.toHaveBeenCalled();
    expect(textarea.hasAttribute("submitOnEnter")).toBe(false);
    setSubmitOnEnter(true);
    expect(keydown(textarea)).toBe(false);
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
  });

  it("disables the input while the thread is disabled even with disabled=false", () => {
    const { runtime, setDisabled, onNew } = createTestRuntime();
    const textarea = mountInput(runtime, { disabled: false });
    input(textarea, "hello");
    expect(textarea.disabled).toBe(false);
    setDisabled(true);
    expect(textarea.disabled).toBe(true);
    textarea.disabled = false;
    expect(keydown(textarea)).toBe(true);
    expect(onNew).not.toHaveBeenCalled();
    setDisabled(false);
    expect(textarea.disabled).toBe(false);
  });

  it("names the textarea input unless the caller passes a name and forwards live attributes and refs", () => {
    const { runtime } = createTestRuntime();
    expect(mountInput(runtime).name).toBe("input");
    const ref = vi.fn();
    const [name, setName] = createSignal("prompt");
    const textarea = mountInput(runtime, {
      ref,
      class: "editor",
      get name() {
        return name();
      },
      get "aria-label"() {
        return name();
      },
    });
    expect(textarea.name).toBe("prompt");
    expect(textarea.className).toBe("editor");
    expect(ref.mock.calls[0]![0]).toBe(textarea);
    setName("message");
    expect(textarea.name).toBe("message");
    expect(textarea.getAttribute("aria-label")).toBe("message");
  });

  it("stays inert for a message edit composer that is not editing", () => {
    const { runtime, onNew } = createTestRuntime();
    const textarea = mountInput(runtime, {}, true);
    expect(textarea.value).toBe("");
    input(textarea, "typing");
    expect(textarea.value).toBe("");
    expect(keydown(textarea)).toBe(true);
    expect(
      runtime.thread.getMessageByIndex(0).composer.getState().isEditing,
    ).toBe(false);
    expect(onNew).not.toHaveBeenCalled();
    flushTapSync(() =>
      runtime.thread.getMessageByIndex(0).composer.beginEdit(),
    );
    expect(textarea.value).toBe("original");
    input(textarea, "edited");
    expect(runtime.thread.getMessageByIndex(0).composer.getState().text).toBe(
      "edited",
    );
  });

  it("leaves other keys alone and lets Enter fall through when sending is disabled", () => {
    const { runtime, onNew, setRunning } = createTestRuntime();
    const textarea = mountInput(runtime);
    expect(keydown(textarea)).toBe(true);
    input(textarea, "hello");
    expect(keydown(textarea, { key: "a" })).toBe(true);
    setRunning(true);
    expect(textarea.disabled).toBe(false);
    expect(keydown(textarea)).toBe(true);
    expect(onNew).not.toHaveBeenCalled();
    expect(runtime.thread.composer.getState().text).toBe("hello");
  });

  it("honors live caller disabled state even if the DOM is forcibly enabled", async () => {
    const { runtime, onNew } = createTestRuntime();
    const [disabled, setDisabled] = createSignal(true);
    const textarea = mountInput(runtime, {
      get disabled() {
        return disabled();
      },
    });
    flushTapSync(() => runtime.thread.composer.setText("hello"));
    expect(textarea.disabled).toBe(true);
    textarea.disabled = false;
    expect(keydown(textarea)).toBe(true);
    expect(onNew).not.toHaveBeenCalled();
    setDisabled(false);
    expect(keydown(textarea)).toBe(false);
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
  });

  it.each([false, true])(
    "runs the caller's input handler first and honors its veto (bound=%s)",
    (bound) => {
      const { runtime } = createTestRuntime();
      const [veto, setVeto] = createSignal(true);
      const handler: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> =
        vi.fn((event) => {
          expect(runtime.thread.composer.getState().text).toBe("");
          if (veto()) event.preventDefault();
        });
      const boundHandler = vi.fn(
        (data: string, event: Parameters<typeof handler>[0]) => {
          expect(data).toBe("caller");
          handler(event);
        },
      );
      const textarea = mountInput(runtime, {
        onInput: bound ? [boundHandler, "caller"] : handler,
      });
      expect(input(textarea, "vetoed")).toBe(false);
      expect(handler).toHaveBeenCalledOnce();
      expect(runtime.thread.composer.getState().text).toBe("");
      setVeto(false);
      input(textarea, "accepted");
      expect(runtime.thread.composer.getState().text).toBe("accepted");
    },
  );

  it.each([false, true])(
    "runs the caller's keydown handler first and lets preventDefault stop the send (bound=%s)",
    async (bound) => {
      const { runtime, onNew } = createTestRuntime();
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: KeyboardEvent) => {
        expect(onNew).not.toHaveBeenCalled();
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: KeyboardEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const textarea = mountInput(runtime, {
        onKeyDown: bound ? ([boundHandler, "caller"] as const) : handler,
      });
      input(textarea, "hello");
      expect(keydown(textarea)).toBe(false);
      expect(handler).toHaveBeenCalledOnce();
      expect(onNew).not.toHaveBeenCalled();
      expect(runtime.thread.composer.getState().text).toBe("hello");
      setVeto(false);
      expect(keydown(textarea)).toBe(false);
      await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    },
  );
});
