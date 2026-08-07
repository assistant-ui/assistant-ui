import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
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
import { MessagePrimitiveParts } from "../primitives/MessagePrimitiveParts";
import { PartByIndexProvider } from "../primitives/PartByIndexProvider";
import { ActionBarPrimitiveReload } from "../primitives/actionBar";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

const convertDemoMessage = (message: DemoMessage) => ({
  id: message.id,
  role: message.role,
  content:
    message.text === "" ? [] : [{ type: "text" as const, text: message.text }],
});

let nextId = 0;
const freshId = (prefix: string) => `${prefix}-${nextId++}`;

const createShrinkRuntime = () => {
  let messages: DemoMessage[] = [];
  let isRunning = false;
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning,
    convertMessage: convertDemoMessage,
    onNew: async () => {},
    setMessages: (next) => {
      messages = next;
      sync();
    },
    onReload: async () => {
      messages = [
        ...messages.slice(0, -1),
        { id: freshId("assistant"), role: "assistant", text: "" },
      ];
      isRunning = true;
      sync();
    },
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeAdapter());
  const seed = (next: DemoMessage[], running = false) => {
    messages = next;
    isRunning = running;
    sync();
  };
  return { runtime, seed };
};

const PartsView = defineComponent({
  setup() {
    const role = useAuiState((s) => s.message.role);
    return () =>
      h("li", { class: "msg", "data-role": role.value }, [
        h(MessagePrimitiveParts),
        h(
          ActionBarPrimitiveReload,
          { class: "reload" },
          { default: () => "Reload" },
        ),
      ]);
  },
});

const mountChat = (runtime: AssistantRuntimeImpl) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h(PartsView),
              }),
          },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

const lookupErrors = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.filter((args) =>
    args.some((arg) => String(arg).includes("useClientLookup")),
  );

describe("by-index scope shrink races", () => {
  it("reload replacing the assistant message with empty content logs no lookup error", async () => {
    const { runtime, seed } = createShrinkRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
      expect(el.textContent).toContain("hello");
    });

    const errorSpy = vi.spyOn(console, "error");
    el.querySelector<HTMLButtonElement>(
      'li[data-role="assistant"] button.reload',
    )!.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.textContent).not.toContain("hello");
    });

    expect(lookupErrors(errorSpy)).toEqual([]);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a2", role: "assistant", text: "recovered" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.textContent).toContain("recovered");
    });
    expect(lookupErrors(errorSpy)).toEqual([]);

    errorSpy.mockRestore();
    unmount();
  });

  it("shrinking the message list under mounted message scopes logs no lookup error", async () => {
    const { runtime, seed } = createShrinkRuntime();
    const { el, unmount } = mountChat(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "one" },
        { id: "a1", role: "assistant", text: "two" },
        { id: "u2", role: "user", text: "three" },
        { id: "a2", role: "assistant", text: "four" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(4);
    });

    const errorSpy = vi.spyOn(console, "error");
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "one" },
        { id: "a1", role: "assistant", text: "two" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.msg")).toHaveLength(2);
    });

    expect(lookupErrors(errorSpy)).toEqual([]);

    errorSpy.mockRestore();
    unmount();
  });

  it("a never-valid part index still throws when read", () => {
    const { runtime, seed } = createShrinkRuntime();
    seed([
      { id: "u1", role: "user", text: "hi" },
      { id: "a1", role: "assistant", text: "hello" },
    ]);

    const NeverValidReader = defineComponent({
      setup() {
        const type = useAuiState((s) => s.part.type);
        return () => h("span", type.value);
      },
    });

    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
            {
              default: () =>
                h(ThreadPrimitiveMessages, null, {
                  default: () =>
                    h(
                      PartByIndexProvider,
                      { index: 99 },
                      { default: () => h(NeverValidReader) },
                    ),
                }),
            },
          ),
      }),
    );
    const el = document.createElement("div");
    expect(() => app.mount(el)).toThrow(/out of bounds/);
  });
});
