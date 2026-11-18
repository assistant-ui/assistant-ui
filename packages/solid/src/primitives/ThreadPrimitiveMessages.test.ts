import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, onCleanup, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
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
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { MessagePrimitiveParts } from "./MessagePrimitiveParts";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
};
const message = (id: string, text: string): DemoMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text }],
});
const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  let isRunning = false;
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    setMessages: (next: DemoMessage[], running = false) => {
      messages = next;
      isRunning = running;
      core.setAdapter(makeAdapter());
    },
  };
};
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mountChat = (runtime: AssistantRuntimeImpl, row: () => JSX.Element) => {
  const el = document.createElement("div");
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(ThreadPrimitiveMessages, {
            get children() {
              return createComponent(row, {});
            },
          });
        },
      }),
    el,
  );
  disposers.push(dispose);
  return el;
};
const Row = () => {
  const state = useAuiState((s) => s.message);
  return createComponent(Dynamic, {
    component: "li",
    class: "msg",
    get "data-id"() {
      return state().id;
    },
    get "data-role"() {
      return state().role;
    },
    get children() {
      return state()
        .content.map((part) => (part.type === "text" ? part.text : ""))
        .join("");
    },
  });
};

describe("ThreadPrimitiveMessages", () => {
  it("renders one scoped child instance per thread message", () => {
    const { runtime, setMessages } = createTestRuntime();
    const el = mountChat(runtime, Row);
    expect(el.querySelectorAll("li")).toHaveLength(0);
    flushTapSync(() =>
      setMessages([
        message("u1", "hi"),
        { ...message("a1", "hello!"), role: "assistant" },
      ]),
    );
    const rows = [...el.querySelectorAll("li")];
    expect(rows.map((row) => row.getAttribute("data-role"))).toEqual([
      "user",
      "assistant",
    ]);
    expect(rows.map((row) => row.textContent)).toEqual(["hi", "hello!"]);
  });

  it("remounts a row when its identity changes and keeps it on in-place updates", () => {
    const { runtime, setMessages } = createTestRuntime();
    let mounts = 0;
    let unmounts = 0;
    const el = mountChat(runtime, () => {
      mounts++;
      onCleanup(() => {
        unmounts++;
      });
      return createComponent(Row, {});
    });
    flushTapSync(() => setMessages([message("u1", "hello")]));
    const first = el.querySelector("li");
    expect(first?.textContent).toBe("hello");
    expect(mounts).toBe(1);
    flushTapSync(() => setMessages([message("u1", "hello edited in place")]));
    expect(el.querySelector("li")).toBe(first);
    expect(first?.textContent).toBe("hello edited in place");
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
    flushTapSync(() => setMessages([message("u2", "replaced occupant")]));
    expect(el.querySelector('li[data-id="u1"]')).toBeNull();
    expect(el.querySelector('li[data-id="u2"]')?.textContent).toBe(
      "replaced occupant",
    );
    expect(mounts).toBe(2);
    expect(unmounts).toBe(1);
  });

  it("keeps sibling row instances when a middle message is deleted", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runtime, setMessages } = createTestRuntime();
    const el = mountChat(runtime, Row);
    flushTapSync(() =>
      setMessages([
        message("a", "first"),
        message("b", "second"),
        message("c", "third"),
      ]),
    );
    const [first, , third] = el.querySelectorAll("li");
    flushTapSync(() =>
      setMessages([message("a", "first"), message("c", "third")]),
    );
    await Promise.resolve();
    expect([...el.querySelectorAll("li")]).toEqual([first, third]);
    expect(el.querySelector('li[data-id="b"]')).toBeNull();
    expect(third?.textContent).toBe("third");
    expect(error).not.toHaveBeenCalled();
  });

  it("removes rows cleanly without stale scope reports", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { runtime, setMessages } = createTestRuntime();
    const el = mountChat(runtime, Row);
    flushTapSync(() => setMessages([message("gone", "text")]));
    expect(el.querySelectorAll("li")).toHaveLength(1);
    flushTapSync(() => setMessages([]));
    await Promise.resolve();
    expect(el.querySelectorAll("li")).toHaveLength(0);
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps the streaming optimistic tail row mounted across store updates", () => {
    const { runtime, setMessages } = createTestRuntime();
    let mounts = 0;
    const el = mountChat(runtime, () => {
      mounts++;
      return createComponent(Row, {});
    });
    const messages = [message("u1", "question")];
    flushTapSync(() => setMessages(messages, true));
    expect(el.querySelectorAll("li")).toHaveLength(2);
    const tail = el.querySelector('li[data-role="assistant"]');
    const mountsAfterPlaceholder = mounts;
    flushTapSync(() => setMessages(messages, true));
    flushTapSync(() => setMessages(messages, true));
    expect(el.querySelector('li[data-role="assistant"]')).toBe(tail);
    expect(mounts).toBe(mountsAfterPlaceholder);
  });

  it("shrinking the message list under mounted message scopes logs no lookup error", async () => {
    const { runtime, setMessages } = createTestRuntime();
    const el = mountChat(runtime, () =>
      createComponent(Dynamic, {
        component: "li",
        get children() {
          return createComponent(MessagePrimitiveParts, {});
        },
      }),
    );
    const messages = [
      message("u1", "one"),
      message("a1", "two"),
      message("u2", "three"),
      message("a2", "four"),
    ];
    flushTapSync(() => setMessages(messages));
    expect(el.querySelectorAll("li")).toHaveLength(4);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setMessages(messages.slice(0, 2)));
    await Promise.resolve();
    expect(el.querySelectorAll("li")).toHaveLength(2);
    expect(el.textContent).toBe("onetwo");
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps row instances and their live scopes on reorders", () => {
    const { runtime, setMessages } = createTestRuntime();
    const el = mountChat(runtime, Row);
    flushTapSync(() =>
      setMessages([message("a", "first"), message("b", "second")]),
    );
    const [first, second] = el.querySelectorAll("li");
    flushTapSync(() =>
      setMessages([message("b", "updated second"), message("a", "first")]),
    );
    expect([...el.querySelectorAll("li")]).toEqual([second, first]);
    expect(second?.textContent).toBe("updated second");
  });
});
