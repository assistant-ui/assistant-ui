import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, mergeProps } from "solid-js";
import { render } from "solid-js/web";
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
import { ComposerPrimitiveInput } from "./ComposerPrimitiveInput";
import { ComposerPrimitiveSend } from "./ComposerPrimitiveSend";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

const createTestRuntime = () => {
  let messages: readonly DemoMessage[] = [
    { id: "u1", role: "user", text: "hello" },
  ];
  let isRunning = false;
  let isDisabled = false;
  const onNew = vi.fn<(message: AppendMessage) => Promise<void>>(
    async () => {},
  );
  const onEdit = vi.fn(async (message: AppendMessage) => {
    const text = message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    messages = [
      { id: "u2", role: "user", text },
      { id: "a2", role: "assistant", text: `Echo: ${text}` },
    ];
    core.setAdapter(makeAdapter());
  });
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning,
    isDisabled,
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew,
    onEdit,
    setMessages: (next) => {
      messages = next;
      core.setAdapter(makeAdapter());
    },
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    onNew,
    onEdit,
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

const mountSend = (
  runtime: AssistantRuntimeImpl,
  props: Parameters<typeof ComposerPrimitiveSend>[0] = {},
  editingMessage = false,
) => {
  const el = document.createElement("div");
  document.body.append(el);
  const View = () => [
    createComponent(ComposerPrimitiveInput, {}),
    createComponent(
      ComposerPrimitiveSend,
      mergeProps({ children: "Send" }, props),
    ),
  ];
  const Scope = () => {
    const aui = useAui();
    if (!editingMessage) return createComponent(View, {});
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
        return createComponent(View, {});
      },
    });
  };
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(Scope, {});
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return {
    button: el.querySelector("button")!,
    textarea: el.querySelector("textarea")!,
  };
};

describe("ComposerPrimitiveSend", () => {
  it("disables send on an empty composer and sends on click", async () => {
    const { runtime, onNew } = createTestRuntime();
    const { button, textarea } = mountSend(runtime, { class: "send" });
    expect(button.type).toBe("button");
    expect(button.className).toBe("send");
    expect(button.textContent).toBe("Send");
    expect(button.disabled).toBe(true);
    textarea.value = "hello";
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
    });
    await vi.waitFor(() => expect(button.disabled).toBe(true));
  });

  it("keeps a caller-disabled send button disabled and inert", async () => {
    const { runtime, onNew } = createTestRuntime();
    const [disabled, setDisabled] = createSignal(true);
    const { button } = mountSend(runtime, {
      get disabled() {
        return disabled();
      },
    });
    flushTapSync(() => runtime.thread.composer.setText("hello"));
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onNew).not.toHaveBeenCalled();
    setDisabled(false);
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
  });

  it("cannot send from an empty composer even if the DOM is forcibly enabled", () => {
    const { runtime, onNew } = createTestRuntime();
    const { button } = mountSend(runtime, { disabled: false });
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onNew).not.toHaveBeenCalled();
  });

  it("disables sends while the thread is disabled or a run cannot queue them", async () => {
    const { runtime, onNew, setDisabled, setRunning } = createTestRuntime();
    const { button, textarea } = mountSend(runtime, { disabled: false });
    flushTapSync(() => runtime.thread.composer.setText("draft"));
    setDisabled(true);
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onNew).not.toHaveBeenCalled();
    setDisabled(false);
    expect(button.disabled).toBe(false);
    setRunning(true);
    expect(button.disabled).toBe(true);
    expect(textarea.disabled).toBe(false);
    button.disabled = false;
    button.click();
    expect(onNew).not.toHaveBeenCalled();
    setRunning(false);
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
  });

  it.each([false, true])(
    "runs the caller's click handler first and honors its veto (bound=%s)",
    async (bound) => {
      const { runtime, onNew } = createTestRuntime();
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: MouseEvent) => {
        expect(onNew).not.toHaveBeenCalled();
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const { button } = mountSend(runtime, {
        onClick: bound ? [boundHandler, "caller"] : handler,
      });
      flushTapSync(() => runtime.thread.composer.setText("hello"));
      button.click();
      expect(handler).toHaveBeenCalledOnce();
      expect(onNew).not.toHaveBeenCalled();
      expect(runtime.thread.composer.getState().text).toBe("hello");
      setVeto(false);
      button.click();
      await vi.waitFor(() => expect(onNew).toHaveBeenCalledOnce());
    },
  );

  it("forwards refs and keeps children and attributes reactive", () => {
    const { runtime } = createTestRuntime();
    const [label, setLabel] = createSignal("Send");
    const ref = vi.fn();
    const { button } = mountSend(runtime, {
      ref,
      get "aria-label"() {
        return label();
      },
      get children() {
        return label();
      },
    });
    expect(ref.mock.calls[0]![0]).toBe(button);
    expect(button.textContent).toBe("Send");
    setLabel("Save");
    expect(button.textContent).toBe("Save");
    expect(button.getAttribute("aria-label")).toBe("Save");
  });

  it("saves a message edit and clears the controlled editor", async () => {
    const { runtime, onEdit, onNew } = createTestRuntime();
    const { button, textarea } = mountSend(runtime, {}, true);
    expect(textarea.value).toBe("");
    expect(button.disabled).toBe(true);
    flushTapSync(() =>
      runtime.thread.getMessageByIndex(0).composer.beginEdit(),
    );
    expect(textarea.value).toBe("hello");
    expect(button.disabled).toBe(false);
    textarea.value = "goodbye";
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    button.click();
    await vi.waitFor(() => {
      expect(onEdit).toHaveBeenCalledOnce();
      expect(
        runtime.thread.getState().messages.map((message) => message.content[0]),
      ).toEqual([
        { type: "text", text: "goodbye" },
        { type: "text", text: "Echo: goodbye" },
      ]);
      expect(textarea.value).toBe("");
      expect(button.disabled).toBe(true);
    });
    expect(onEdit.mock.calls[0]![0]).toMatchObject({
      sourceId: "u1",
      content: [{ type: "text", text: "goodbye" }],
    });
    expect(onNew).not.toHaveBeenCalled();
  });
});
