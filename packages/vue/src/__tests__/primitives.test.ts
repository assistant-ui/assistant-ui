import { describe, expect, it, vi } from "vitest";
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

type DemoMessage = { role: "user" | "assistant"; text: string };

const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  const onNew = vi.fn(async () => {});
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    convertMessage: (message) => ({
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew,
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const append = (message: DemoMessage) => {
    messages = [...messages, message];
    core.setAdapter(makeAdapter());
  };
  return { runtime, append, onNew };
};

const MessageProbe = defineComponent({
  setup() {
    const role = useAuiState((s) => s.message.role);
    const text = useAuiState((s) => {
      const part = s.message.content[0];
      return part?.type === "text" ? part.text : "";
    });
    return () => h("li", { class: "msg", "data-role": role.value }, text.value);
  },
});

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          { default: () => h(view) },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

describe("vue primitives", () => {
  it("renders one scoped slot instance per thread message", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, { default: () => h(MessageProbe) }),
    });
    const { el, unmount } = mountChat(runtime, View);

    expect(el.querySelectorAll("li.msg")).toHaveLength(0);

    flushTapSync(() => append({ role: "user", text: "hi" }));
    flushTapSync(() => append({ role: "assistant", text: "hello!" }));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    const items = [...el.querySelectorAll("li.msg")];
    expect(items.map((item) => item.getAttribute("data-role"))).toEqual([
      "user",
      "assistant",
    ]);
    expect(items.map((item) => item.textContent)).toEqual(["hi", "hello!"]);

    unmount();
  });

  it("binds the composer text and submits on Enter", async () => {
    const { runtime, onNew } = createTestRuntime();
    const View = defineComponent({
      setup: () => () => h(ComposerPrimitiveInput),
    });
    const { el, unmount } = mountChat(runtime, View);

    const textarea = el.querySelector("textarea")!;
    textarea.value = "hello";
    flushTapSync(() => textarea.dispatchEvent(new Event("input")));

    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(onNew).toHaveBeenCalledTimes(1);
    });
    expect(onNew.mock.calls[0]![0]).toMatchObject({
      content: [{ type: "text", text: "hello" }],
    });

    unmount();
  });

  it("keeps Shift+Enter as a newline", async () => {
    const { runtime, onNew } = createTestRuntime();
    const View = defineComponent({
      setup: () => () => h(ComposerPrimitiveInput),
    });
    const { el, unmount } = mountChat(runtime, View);

    const textarea = el.querySelector("textarea")!;
    textarea.value = "hello";
    flushTapSync(() => textarea.dispatchEvent(new Event("input")));
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        cancelable: true,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve));
    expect(onNew).not.toHaveBeenCalled();

    unmount();
  });

  it("disables send on an empty composer and sends on click", async () => {
    const { runtime, onNew } = createTestRuntime();
    const View = defineComponent({
      setup: () => () => [
        h(ComposerPrimitiveInput),
        h(ComposerPrimitiveSend, null, { default: () => "Send" }),
      ],
    });
    const { el, unmount } = mountChat(runtime, View);

    const button = el.querySelector("button")!;
    expect(button.disabled).toBe(true);

    const textarea = el.querySelector("textarea")!;
    textarea.value = "hello";
    textarea.dispatchEvent(new Event("input"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(button.disabled).toBe(false);
    });

    button.click();
    await vi.waitFor(() => {
      expect(onNew).toHaveBeenCalledTimes(1);
    });

    unmount();
  });

  it("stays inert for a message edit composer that is not editing", async () => {
    const { runtime, append, onNew } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () => h(ComposerPrimitiveInput),
        }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() => append({ role: "user", text: "hi" }));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("textarea")).not.toBeNull();
    });

    const textarea = el.querySelector("textarea")!;
    expect(textarea.value).toBe("");
    textarea.value = "typing";
    textarea.dispatchEvent(new Event("input"));
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", cancelable: true }),
    );

    await new Promise((resolve) => setTimeout(resolve));
    expect(onNew).not.toHaveBeenCalled();

    unmount();
  });

  it("disables cancel while nothing is cancellable", () => {
    const { runtime } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ComposerPrimitiveCancel, null, { default: () => "Stop" }),
    });
    const { el, unmount } = mountChat(runtime, View);

    expect(el.querySelector("button")!.disabled).toBe(true);

    unmount();
  });
});
