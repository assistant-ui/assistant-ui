import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
  ExternalStoreAdapter,
  ThreadMessageLike,
  ToolApprovalOption,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "@assistant-ui/vue";

import Thread from "./thread.vue";

const mountThread = (
  messages: readonly ThreadMessageLike[],
  options: {
    isRunning?: boolean;
    adapter?: Partial<ExternalStoreAdapter<ThreadMessageLike>>;
  } = {},
) => {
  const adapter: ExternalStoreAdapter<ThreadMessageLike> = {
    messages: [...messages],
    convertMessage: (message) => message,
    onNew: async () => {},
    ...(options.isRunning === undefined
      ? {}
      : { isRunning: options.isRunning }),
    ...options.adapter,
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

const buttons = (root: ParentNode) => [
  ...root.querySelectorAll<HTMLButtonElement>("button"),
];

const button = (root: ParentNode, label: string) => {
  const match = buttons(root).find(
    (item) => item.textContent?.trim() === label,
  );
  if (!match) throw new Error(`no "${label}" button`);
  return match;
};

const trigger = (root: ParentNode, slot: string) =>
  root.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)!;

const pendingApproval = (
  approval: { options?: readonly ToolApprovalOption[] } = {},
): ThreadMessageLike => ({
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "delete_file",
      args: { path: "notes.txt" },
      approval: { id: "approval-1", ...approval },
    },
  ],
});

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

  it("renders an unregistered tool call through the fallback with its args and result", async () => {
    const { el, unmount } = mountThread([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "get_weather",
            args: { city: "sf" },
            result: { temperature: 72 },
          },
        ],
      },
    ]);

    await settle(() =>
      expect(el.textContent).toContain("Used tool: get_weather"),
    );
    expect(el.querySelector('[data-slot="aui_tool-fallback-args"]')).toBeNull();

    trigger(el, "aui_tool-fallback-trigger").click();

    await settle(() =>
      expect(
        el.querySelector('[data-slot="aui_tool-fallback-args"]')?.textContent,
      ).toBe('{"city":"sf"}'),
    );
    expect(
      el.querySelector('[data-slot="aui_tool-fallback-result"]')?.textContent,
    ).toContain('"temperature": 72');

    unmount();
  });

  it("opens a tool call awaiting approval and answers it from the fallback", async () => {
    const onRespondToToolApproval = vi.fn();
    const { el, unmount } = mountThread([pendingApproval()], {
      adapter: { onRespondToToolApproval },
    });

    await settle(() =>
      expect(el.textContent).toContain("Waiting on tool: delete_file"),
    );
    button(el, "Allow").click();

    await settle(() => expect(onRespondToToolApproval).toHaveBeenCalled());
    expect(onRespondToToolApproval.mock.calls[0]![0]).toMatchObject({
      approvalId: "approval-1",
      approved: true,
    });
    expect(button(el, "Deny").disabled).toBe(true);

    unmount();
  });

  it("confirms a declared approval option before answering with it", async () => {
    const onRespondToToolApproval = vi.fn();
    const { el, unmount } = mountThread(
      [
        pendingApproval({
          options: [
            { id: "once", kind: "allow-once" },
            { id: "always", kind: "allow-always", confirm: true },
            { id: "never", kind: "reject-once" },
          ],
        }),
      ],
      { adapter: { onRespondToToolApproval } },
    );

    await settle(() => expect(button(el, "Always allow")).toBeDefined());
    expect(
      buttons(el).filter((item) => item.textContent?.trim() === "Deny"),
    ).toHaveLength(1);
    button(el, "Always allow").click();

    await settle(() => expect(el.textContent).toContain("Always allow?"));
    expect(onRespondToToolApproval).not.toHaveBeenCalled();
    button(el, "Confirm").click();

    await settle(() => expect(onRespondToToolApproval).toHaveBeenCalled());
    expect(onRespondToToolApproval.mock.calls[0]![0]).toMatchObject({
      approvalId: "approval-1",
      optionId: "always",
    });

    unmount();
  });

  it("shows a settled approval as a receipt instead of live controls", async () => {
    const { el, unmount } = mountThread([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "delete_file",
            args: { path: "notes.txt" },
            result: "deleted",
            approval: { id: "approval-1", approved: false },
          },
        ],
      },
    ]);

    await settle(() =>
      expect(el.textContent).toContain("Used tool: delete_file"),
    );
    trigger(el, "aui_tool-fallback-trigger").click();

    await settle(() =>
      expect(
        el.querySelector('[data-slot="aui_tool-fallback-approval-receipt"]')
          ?.textContent,
      ).toContain("Denied"),
    );
    expect(
      buttons(el).some((item) => item.textContent?.trim() === "Allow"),
    ).toBe(false);

    unmount();
  });

  it("collapses finished reasoning behind a trigger that reveals its markdown", async () => {
    const { el, unmount } = mountThread([
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "weighing **options**" },
          { type: "text", text: "done" },
        ],
      },
    ]);

    await settle(() =>
      expect(
        el.querySelector('[data-slot="aui_reasoning-trigger"]'),
      ).not.toBeNull(),
    );
    expect(el.querySelector('[data-slot="aui_reasoning-text"]')).toBeNull();

    trigger(el, "aui_reasoning-trigger").click();

    await settle(() =>
      expect(
        el.querySelector('[data-slot="aui_reasoning-text"] strong')
          ?.textContent,
      ).toBe("options"),
    );

    unmount();
  });

  it("holds reasoning open while it streams", async () => {
    const { el, unmount } = mountThread(
      [
        {
          role: "assistant",
          content: [{ type: "reasoning", text: "still thinking" }],
        },
      ],
      { isRunning: true },
    );

    await settle(() =>
      expect(
        el.querySelector('[data-slot="aui_reasoning-text"]')?.textContent,
      ).toContain("still thinking"),
    );
    expect(
      el
        .querySelector('[data-slot="aui_reasoning-content"]')
        ?.getAttribute("aria-busy"),
    ).toBe("true");

    unmount();
  });
});
