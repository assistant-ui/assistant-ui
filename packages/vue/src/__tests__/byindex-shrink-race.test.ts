import { afterEach, describe, expect, it, vi } from "vitest";
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

const staleReports = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.filter((args) =>
    args.some((arg) =>
      String(arg).includes(
        "PartByIndexProvider: index 0 is still out of bounds",
      ),
    ),
  );

const PartTypeReader = defineComponent({
  setup() {
    const type = useAuiState((s) => s.part.type);
    return () => h("span", { class: "part-type" }, type.value);
  },
});

const PinnedPartView = defineComponent({
  setup() {
    const role = useAuiState((s) => s.message.role);
    return () =>
      h("li", { class: "msg", "data-role": role.value }, [
        h(
          PartByIndexProvider,
          { index: 0 },
          { default: () => h(PartTypeReader) },
        ),
      ]);
  },
});

const mountPinnedPart = (runtime: AssistantRuntimeImpl) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h(PinnedPartView),
              }),
          },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, app };
};

describe("by-index scope shrink races", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    unmount();
  });

  it("a provider still out of bounds after the flush reverts to throwing", async () => {
    const { runtime, seed } = createShrinkRuntime();
    const { el, app } = mountPinnedPart(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.part-type")).toHaveLength(2);
    });

    const errorSpy = vi.spyOn(console, "error");
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "" },
      ]),
    );
    expect(lookupErrors(errorSpy)).toEqual([]);

    await vi.waitFor(async () => {
      await nextTick();
      expect(staleReports(errorSpy).length).toBeGreaterThan(0);
    });

    app.unmount();
  });

  it("a same-tick recovery keeps the refreshed cache and a later shrink still expires", async () => {
    const { runtime, seed } = createShrinkRuntime();
    const { el, app } = mountPinnedPart(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.part-type")).toHaveLength(2);
    });

    const errorSpy = vi.spyOn(console, "error");
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "" },
      ]),
    );
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "restored" },
      ]),
    );
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "" },
      ]),
    );

    await vi.waitFor(async () => {
      await nextTick();
      expect(staleReports(errorSpy).length).toBeGreaterThan(0);
    });
    expect(lookupErrors(errorSpy)).toEqual([]);

    const reportsBeforeRecovery = staleReports(errorSpy).length;
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "again" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.part-type")).toHaveLength(2);
    });
    expect(staleReports(errorSpy).length).toBe(reportsBeforeRecovery);
    expect(lookupErrors(errorSpy)).toEqual([]);

    app.unmount();
  });

  it("a recovered cache survives the expiry and still guards a later shrink", async () => {
    const { runtime, seed } = createShrinkRuntime();
    const { el, app } = mountPinnedPart(runtime);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "hello" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.part-type")).toHaveLength(2);
    });

    const errorSpy = vi.spyOn(console, "error");
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "" },
      ]),
    );
    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "restored" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("span.part-type")).toHaveLength(2);
    });
    expect(staleReports(errorSpy)).toEqual([]);

    flushTapSync(() =>
      seed([
        { id: "u1", role: "user", text: "hi" },
        { id: "a1", role: "assistant", text: "" },
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(staleReports(errorSpy).length).toBeGreaterThan(0);
    });
    expect(lookupErrors(errorSpy)).toEqual([]);

    app.unmount();
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
