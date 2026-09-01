import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "@assistant-ui/vue";

import Thread from "./thread.vue";

const mountThread = (
  messages: readonly ThreadMessageLike[],
  options: { isRunning?: boolean } = {},
) => {
  const adapter: ExternalStoreAdapter<ThreadMessageLike> = {
    messages: [...messages],
    convertMessage: (message) => message,
    onNew: async () => {},
    ...(options.isRunning === undefined
      ? {}
      : { isRunning: options.isRunning }),
  };
  const core = new ExternalStoreRuntimeCore(adapter);
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
  return {
    el,
    unmount: () => {
      app.unmount();
      el.remove();
    },
  };
};

const rows = (root: ParentNode) => [
  ...root.querySelectorAll<HTMLElement>("li[data-role]"),
];

const settle = (assert: () => void) =>
  vi.waitFor(async () => {
    await nextTick();
    assert();
  });

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

describe("vue thread", () => {
  it("greets on an empty thread and composes a send-capable composer", async () => {
    const { el, unmount } = mountThread([]);

    await settle(() =>
      expect(el.textContent).toContain("How can I help you today?"),
    );
    expect(el.querySelector("textarea")).not.toBeNull();
    expect(el.querySelector('[aria-label="Send"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Stop"]')).toBeNull();

    unmount();
  });

  it("swaps send for stop while the thread runs", async () => {
    const { el, unmount } = mountThread([], { isRunning: true });

    await settle(() =>
      expect(el.querySelector('[aria-label="Stop"]')).not.toBeNull(),
    );
    expect(el.querySelector('[aria-label="Send"]')).toBeNull();

    unmount();
  });

  it("drops the greeting and renders a row per message role", async () => {
    const { el, unmount } = mountThread([
      { role: "user", content: [{ type: "text", text: "hi" }] },
      { role: "assistant", content: [{ type: "text", text: "hello" }] },
    ]);

    await settle(() => expect(rows(el)).toHaveLength(2));
    expect(rows(el).map((row) => row.dataset["role"])).toEqual([
      "user",
      "assistant",
    ]);
    expect(el.textContent).not.toContain("How can I help you today?");

    unmount();
  });

  it("renders assistant text as markdown and user text verbatim", async () => {
    const { el, unmount } = mountThread([
      { role: "user", content: [{ type: "text", text: "**not bold**" }] },
      { role: "assistant", content: [{ type: "text", text: "**bold**" }] },
    ]);

    await settle(() => expect(rows(el)).toHaveLength(2));
    const [user, assistant] = rows(el);
    expect(assistant!.querySelector("strong")?.textContent).toBe("bold");
    expect(user!.querySelector("strong")).toBeNull();
    expect(user!.textContent).toContain("**not bold**");

    unmount();
  });

  it("escapes raw HTML in assistant markdown instead of rendering it", async () => {
    const { el, unmount } = mountThread([
      {
        role: "assistant",
        content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }],
      },
    ]);

    await settle(() => expect(rows(el)).toHaveLength(1));
    expect(el.querySelector("img")).toBeNull();
    expect(el.textContent).toContain("<img src=x onerror=alert(1)>");

    unmount();
  });

  it("surfaces the error of an assistant message that failed", async () => {
    const { el, unmount } = mountThread([
      {
        role: "assistant",
        content: [{ type: "text", text: "partial" }],
        status: {
          type: "incomplete",
          reason: "error",
          error: { code: "unknown", message: "model unavailable" },
        },
      },
    ]);

    await settle(() => expect(el.textContent).toContain("model unavailable"));
    expect(el.textContent).not.toContain("[object Object]");

    unmount();
  });

  it("offers edit only on user rows and regenerate only on assistant rows", async () => {
    const { el, unmount } = mountThread([
      { role: "user", content: [{ type: "text", text: "hi" }] },
      { role: "assistant", content: [{ type: "text", text: "hello" }] },
    ]);

    await settle(() => expect(rows(el)).toHaveLength(2));
    const [user, assistant] = rows(el);
    expect(user!.querySelector('[aria-label="Edit"]')).not.toBeNull();
    expect(user!.querySelector('[aria-label="Regenerate"]')).toBeNull();
    expect(
      assistant!.querySelector('[aria-label="Regenerate"]'),
    ).not.toBeNull();
    expect(assistant!.querySelector('[aria-label="Edit"]')).toBeNull();
    expect(user!.querySelector('[aria-label="Copy"]')).not.toBeNull();

    unmount();
  });
});
