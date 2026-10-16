import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
  ThreadMessageLike,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "@assistant-ui/vue";
import Thread from "./thread.vue";

const mountToolFallback = (
  responseDeliveryStatus?: ToolCallMessagePart["responseDeliveryStatus"],
) => {
  const messages: ThreadMessageLike[] = [
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "computer_call",
          args: { kind: "click" },
          ...(responseDeliveryStatus && { responseDeliveryStatus }),
        },
      ],
    },
  ];
  const core = new ExternalStoreRuntimeCore({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  const runtime = new AssistantRuntimeImpl(core);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          { default: () => h(Thread) },
        ),
    }),
  );
  const el = document.body.appendChild(document.createElement("div"));
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  document.body.replaceChildren();
});

it.each([
  { status: "queued" as const, label: "Reply queued, not sent yet" },
  { status: undefined, label: "Waiting on tool" },
])(
  "renders the $label fallback for a $status reply",
  async ({ status, label }) => {
    const { el, unmount } = mountToolFallback(status);

    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelector('[data-slot="aui_tool-fallback-trigger"]')
          ?.textContent,
      ).toContain(`${label}: computer_call`);
    });
    if (status === undefined) {
      expect(el.textContent).not.toContain("Reply queued, not sent yet");
    }

    unmount();
  },
);
