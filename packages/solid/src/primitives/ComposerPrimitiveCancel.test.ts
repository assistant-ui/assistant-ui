import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, mergeProps } from "solid-js";
import { render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
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
import { ComposerPrimitiveCancel } from "./ComposerPrimitiveCancel";

const createTestRuntime = (supportsCancel = true) => {
  let isRunning = false;
  const onCancel = vi.fn(async () => {});
  const makeAdapter = (): ExternalStoreAdapter<ThreadMessageLike> => ({
    messages: [
      { id: "u1", role: "user", content: [{ type: "text", text: "hello" }] },
    ],
    isRunning,
    convertMessage: (message) => message,
    onNew: async () => {},
    onEdit: async () => {},
    ...(supportsCancel ? { onCancel } : {}),
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    onCancel,
    setRunning: (value: boolean) => {
      isRunning = value;
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const mountCancel = (
  runtime: AssistantRuntimeImpl,
  props: Parameters<typeof ComposerPrimitiveCancel>[0] = {},
  editingMessage = false,
) => {
  const el = document.createElement("div");
  document.body.append(el);
  const View = () => [
    createComponent(ComposerPrimitiveInput, {}),
    createComponent(
      ComposerPrimitiveCancel,
      mergeProps({ children: "Stop" }, props),
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

describe("ComposerPrimitiveCancel", () => {
  it("cancels a running turn through the cancel button", async () => {
    const { runtime, onCancel, setRunning } = createTestRuntime();
    const { button } = mountCancel(runtime, { class: "cancel" });
    expect(button.type).toBe("button");
    expect(button.className).toBe("cancel");
    expect(button.textContent).toBe("Stop");
    expect(button.disabled).toBe(true);
    setRunning(true);
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
    setRunning(false);
    expect(button.disabled).toBe(true);
  });

  it("disables cancel while the runtime cannot cancel", () => {
    const { runtime, onCancel, setRunning } = createTestRuntime(false);
    const { button } = mountCancel(runtime, { disabled: false });
    setRunning(true);
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("honors live caller disabled state even if the DOM is forcibly enabled", async () => {
    const { runtime, onCancel, setRunning } = createTestRuntime();
    const [disabled, setDisabled] = createSignal(true);
    const { button } = mountCancel(runtime, {
      get disabled() {
        return disabled();
      },
    });
    setRunning(true);
    expect(button.disabled).toBe(true);
    button.disabled = false;
    button.click();
    expect(onCancel).not.toHaveBeenCalled();
    setDisabled(false);
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
  });

  it.each([false, true])(
    "runs the caller's click handler first and honors its veto (bound=%s)",
    async (bound) => {
      const { runtime, onCancel, setRunning } = createTestRuntime();
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: MouseEvent) => {
        expect(onCancel).not.toHaveBeenCalled();
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const { button } = mountCancel(runtime, {
        onClick: bound ? [boundHandler, "caller"] : handler,
      });
      setRunning(true);
      button.click();
      expect(handler).toHaveBeenCalledOnce();
      expect(onCancel).not.toHaveBeenCalled();
      setVeto(false);
      button.click();
      await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
    },
  );

  it("forwards refs and keeps children and attributes reactive", () => {
    const { runtime } = createTestRuntime();
    const [label, setLabel] = createSignal("Stop");
    const ref = vi.fn();
    const { button } = mountCancel(runtime, {
      ref,
      get "aria-label"() {
        return label();
      },
      get children() {
        return label();
      },
    });
    expect(ref.mock.calls[0]![0]).toBe(button);
    expect(button.textContent).toBe("Stop");
    setLabel("Discard");
    expect(button.textContent).toBe("Discard");
    expect(button.getAttribute("aria-label")).toBe("Discard");
  });

  it("discards a message edit through the cancel button", async () => {
    const { runtime, onCancel } = createTestRuntime();
    const { button, textarea } = mountCancel(runtime, {}, true);
    expect(textarea.value).toBe("");
    expect(button.disabled).toBe(true);
    flushTapSync(() =>
      runtime.thread.getMessageByIndex(0).composer.beginEdit(),
    );
    expect(textarea.value).toBe("hello");
    expect(button.disabled).toBe(false);
    textarea.value = "discard me";
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(runtime.thread.getMessageByIndex(0).composer.getState().text).toBe(
      "discard me",
    );
    button.click();
    await vi.waitFor(() => {
      expect(textarea.value).toBe("");
      expect(button.disabled).toBe(true);
      expect(
        runtime.thread.getMessageByIndex(0).composer.getState().isEditing,
      ).toBe(false);
    });
    expect(runtime.thread.getState().messages[0]!.content).toEqual([
      { type: "text", text: "hello" },
    ]);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
