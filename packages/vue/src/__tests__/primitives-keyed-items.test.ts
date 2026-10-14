import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
  type ComputedRef,
} from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantState } from "@assistant-ui/store/client";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import type {
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
  getMessagePartKeys,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { MessagePrimitiveParts } from "../primitives/MessagePrimitiveParts";
import { MessagePrimitiveAttachments } from "../primitives/messageAttachments";
import { ThreadPrimitiveSuggestions } from "../primitives/suggestions";
import { useStableKeys } from "../primitives/stableKeys";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
  attachments?: ThreadMessageLike["attachments"];
};

const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const setMessage = (message: DemoMessage) => {
    messages = [message];
    flushTapSync(() => core.setAdapter(makeAdapter()));
  };
  return { runtime, setMessage };
};

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

const labels = (el: HTMLElement) =>
  [...el.querySelectorAll("li")].map((node) => node.textContent);

describe("Vue list item keys", () => {
  it("keeps tool-call slot state with its part when parts swap", async () => {
    const { runtime, setMessage } = createTestRuntime();
    const mounts = vi.fn();
    const Tool = defineComponent({
      setup() {
        mounts();
        const initialName = useAuiState((s) =>
          s.part.type === "tool-call" ? s.part.toolName : "",
        ).value;
        return () => h("li", initialName);
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () =>
            h(MessagePrimitiveParts, null, {
              "tool-call": () => h(Tool),
            }),
        }),
    });
    const { el, unmount } = mountChat(runtime, View);
    const first = {
      type: "tool-call" as const,
      toolCallId: "call-a",
      toolName: "alpha",
      args: {},
    };
    const second = { ...first, toolCallId: "call-b", toolName: "beta" };

    setMessage({ id: "m1", role: "assistant", content: [first, second] });
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["alpha", "beta"]);
    });
    expect(mounts).toHaveBeenCalledTimes(2);

    setMessage({ id: "m1", role: "assistant", content: [second, first] });
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["beta", "alpha"]);
    });
    expect(mounts).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("keeps part keys by reference across source array rebuilds and updates them on identity changes", async () => {
    const { runtime, setMessage } = createTestRuntime();
    const first = {
      type: "tool-call" as const,
      toolCallId: "call-a",
      toolName: "alpha",
      args: {},
    };
    const second = { ...first, toolCallId: "call-b" };
    const message = (part: typeof first, text: string): DemoMessage => ({
      id: "m1",
      role: "assistant",
      content: [part, { type: "text", text }],
    });
    setMessage(message(first, "one"));

    let parts!: ComputedRef<AssistantState["message"]["parts"]>;
    let keys!: ComputedRef<string[]>;
    const Probe = defineComponent({
      setup() {
        parts = useAuiState((s) => s.message.parts);
        keys = useStableKeys(() => getMessagePartKeys(parts.value));
        return () => h("span", keys.value.join(","));
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, { default: () => h(Probe) }),
    });
    const { unmount } = mountChat(runtime, View);
    const initialParts = parts.value;
    const initialKeys = keys.value;

    setMessage(message(first, "two"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(parts.value).not.toBe(initialParts);
    });
    expect(keys.value).toBe(initialKeys);

    setMessage(message(second, "two"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(keys.value).not.toBe(initialKeys);
    });
    expect(keys.value).toEqual(["tool-call:call-b", "text@1"]);
    unmount();
  });

  it("keeps attachment slot state with its attachment when attachments swap", async () => {
    const { runtime, setMessage } = createTestRuntime();
    const mounts = vi.fn();
    const Attachment = defineComponent({
      setup() {
        mounts();
        const initialName = useAuiState((s) => s.attachment.name).value;
        return () => h("li", initialName);
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () =>
            h(MessagePrimitiveAttachments, null, {
              default: () => h(Attachment),
            }),
        }),
    });
    const { el, unmount } = mountChat(runtime, View);
    const first = {
      id: "att-a",
      type: "file" as const,
      name: "alpha.txt",
      contentType: "text/plain",
      status: { type: "complete" as const },
      content: [],
    };
    const second = { ...first, id: "att-b", name: "beta.txt" };
    const message = (
      attachments: ThreadMessageLike["attachments"],
    ): DemoMessage => ({
      id: "m1",
      role: "user",
      content: [{ type: "text", text: "files" }],
      attachments,
    });

    setMessage(message([first, second]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["alpha.txt", "beta.txt"]);
    });
    expect(mounts).toHaveBeenCalledTimes(2);

    setMessage(message([second, first]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["beta.txt", "alpha.txt"]);
    });
    expect(mounts).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("keeps suggestion slot state with its suggestion when suggestions swap", async () => {
    const { runtime } = createTestRuntime();
    const suggestions = ref([
      { title: "alpha", label: "first", prompt: "a" },
      { title: "beta", label: "second", prompt: "b" },
    ]);
    const mounts = vi.fn();
    const Suggestion = defineComponent({
      setup() {
        mounts();
        const initialTitle = useAuiState((s) => s.suggestion.title).value;
        return () => h("li", initialTitle);
      },
    });
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            {
              config: AuiConfig({
                threads: RuntimeAdapter(runtime),
                suggestions: Suggestions(suggestions.value),
              }),
            },
            {
              default: () =>
                h(ThreadPrimitiveSuggestions, null, {
                  default: () => h(Suggestion),
                }),
            },
          ),
      }),
    );
    const el = document.createElement("div");
    app.mount(el);
    expect(labels(el)).toEqual(["alpha", "beta"]);
    expect(mounts).toHaveBeenCalledTimes(2);

    suggestions.value = [suggestions.value[1]!, suggestions.value[0]!];
    await vi.waitFor(
      async () => {
        await nextTick();
        expect(labels(el)).toEqual(["beta", "alpha"]);
      },
      { interval: 5 },
    );
    expect(mounts).toHaveBeenCalledTimes(2);
    app.unmount();
  });
});
