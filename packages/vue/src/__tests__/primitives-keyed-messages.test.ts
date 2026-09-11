import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  onUnmounted,
  type Component,
} from "vue";
import { flushTapSync } from "@assistant-ui/tap";
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
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
};

const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  let core!: ExternalStoreRuntimeCore;
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }),
    onNew: async () => {},
  });
  core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const setMessages = (next: DemoMessage[]) => {
    messages = next;
    core.setAdapter(makeAdapter());
  };
  return { runtime, setMessages };
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

const message = (id: string, text: string): DemoMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text }],
});

describe("ThreadPrimitiveMessages id-keyed iteration", () => {
  it("remounts a row when the occupant of its slot changes identity and keeps it on in-place updates", async () => {
    const { runtime, setMessages } = createTestRuntime();
    let mounts = 0;
    let unmounts = 0;
    const Row = defineComponent({
      setup() {
        mounts += 1;
        onUnmounted(() => {
          unmounts += 1;
        });
        const id = useAuiState((s) => s.message.id);
        const text = useAuiState((s) =>
          s.message.content
            .map((part) => (part.type === "text" ? part.text : ""))
            .join(""),
        );
        return () => h("li", { class: "row", "data-id": id.value }, text.value);
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, { default: () => h(Row) }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() => setMessages([message("u1", "hello")]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector('li[data-id="u1"]')?.textContent).toBe("hello");
    });
    expect(mounts).toBe(1);

    flushTapSync(() => setMessages([message("u1", "hello edited in place")]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector('li[data-id="u1"]')?.textContent).toBe(
        "hello edited in place",
      );
    });
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);

    flushTapSync(() => setMessages([message("u2", "replaced occupant")]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector('li[data-id="u2"]')?.textContent).toBe(
        "replaced occupant",
      );
    });
    expect(el.querySelector('li[data-id="u1"]')).toBeNull();
    expect(mounts).toBe(2);
    expect(unmounts).toBe(1);

    unmount();
  });

  it("keeps sibling row instances when a middle message is deleted", async () => {
    const { runtime, setMessages } = createTestRuntime();
    const instances = new Map<string, number>();
    let nextInstance = 0;
    const Row = defineComponent({
      setup() {
        const instance = nextInstance++;
        const id = useAuiState((s) => s.message.id);
        if (!instances.has(id.value)) instances.set(id.value, instance);
        return () => h("li", { class: "row", "data-id": id.value });
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, { default: () => h(Row) }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      setMessages([
        message("a", "first"),
        message("b", "second"),
        message("c", "third"),
      ]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.row")).toHaveLength(3);
    });
    const firstInstanceOfC = instances.get("c");

    flushTapSync(() =>
      setMessages([message("a", "first"), message("c", "third")]),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.row")).toHaveLength(2);
    });
    expect(el.querySelector('li[data-id="b"]')).toBeNull();
    expect(instances.get("c")).toBe(firstInstanceOfC);

    unmount();
  });

  it("removes rows cleanly without stale scope reports", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runtime, setMessages } = createTestRuntime();
    const Row = defineComponent({
      setup() {
        const id = useAuiState((s) => s.message.id);
        return () => h("li", { class: "row" }, id.value);
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, { default: () => h(Row) }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() => setMessages([message("gone", "text")]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.row")).toHaveLength(1);
    });

    flushTapSync(() => setMessages([]));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.row")).toHaveLength(0);
    });
    await nextTick();
    await nextTick();
    expect(
      error.mock.calls.filter((call) =>
        String(call[0]).includes("MessageByIdProvider"),
      ),
    ).toHaveLength(0);

    unmount();
  });

  it("keeps the streaming optimistic tail row mounted across store updates", async () => {
    let messages: DemoMessage[] = [];
    let isRunning = false;
    let core!: ExternalStoreRuntimeCore;
    const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
      messages,
      isRunning,
      convertMessage: (m) => ({ id: m.id, role: m.role, content: m.content }),
      onNew: async () => {},
    });
    core = new ExternalStoreRuntimeCore(makeAdapter());
    const runtime = new AssistantRuntimeImpl(core);
    const sync = () => core.setAdapter(makeAdapter());

    let mounts = 0;
    const Row = defineComponent({
      setup() {
        mounts += 1;
        const role = useAuiState((s) => s.message.role);
        return () => h("li", { class: "row", "data-role": role.value });
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, { default: () => h(Row) }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() => {
      messages = [message("u1", "question")];
      isRunning = true;
      sync();
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("li.row")).toHaveLength(2);
    });
    const mountsAfterPlaceholder = mounts;

    flushTapSync(() => sync());
    flushTapSync(() => sync());
    await nextTick();
    await nextTick();
    expect(el.querySelectorAll("li.row")).toHaveLength(2);
    expect(mounts).toBe(mountsAfterPlaceholder);

    unmount();
  });
});
