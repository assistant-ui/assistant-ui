import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
} from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter, Suggestions } from "@assistant-ui/core/store";
import type {
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { MessagePrimitiveParts } from "../primitives/MessagePrimitiveParts";
import { MessagePrimitiveAttachments } from "../primitives/messageAttachments";
import { ThreadPrimitiveSuggestions } from "../primitives/suggestions";

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
    const Tool = defineComponent({
      setup() {
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

    setMessage({ id: "m1", role: "assistant", content: [second, first] });
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["beta", "alpha"]);
    });
    unmount();
  });

  it("keeps attachment slot state with its attachment when attachments swap", async () => {
    const { runtime, setMessage } = createTestRuntime();
    const Attachment = defineComponent({
      setup() {
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

    setMessage(message([second, first]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["beta.txt", "alpha.txt"]);
    });
    unmount();
  });

  it("keeps suggestion slot state with its suggestion when suggestions swap", async () => {
    const { runtime } = createTestRuntime();
    const suggestions = ref([
      { title: "alpha", label: "first", prompt: "a" },
      { title: "beta", label: "second", prompt: "b" },
    ]);
    const Suggestion = defineComponent({
      setup() {
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

    suggestions.value = [suggestions.value[1]!, suggestions.value[0]!];
    await vi.waitFor(async () => {
      await nextTick();
      expect(labels(el)).toEqual(["beta", "alpha"]);
    });
    app.unmount();
  });
});
