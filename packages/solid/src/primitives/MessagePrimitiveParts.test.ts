import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createComponent,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { MessagePrimitiveParts } from "./MessagePrimitiveParts";

const createTestRuntime = () => {
  let content: ThreadMessageLike["content"] = [];
  const makeAdapter = () => ({
    messages: [{ id: "a", role: "assistant" as const, content }],
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    setContent: (next: ThreadMessageLike["content"]) => {
      content = next;
      core.setAdapter(makeAdapter());
    },
  };
};
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (
  runtime: AssistantRuntimeImpl,
  getComponents: () => Parameters<
    typeof MessagePrimitiveParts
  >[0]["components"] = () => undefined,
) => {
  const el = document.createElement("div");
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(ThreadPrimitiveMessages, {
            get children() {
              return createComponent(MessagePrimitiveParts, {
                get components() {
                  return getComponents() ?? {};
                },
              });
            },
          });
        },
      }),
    el,
  );
  disposers.push(dispose);
  return { el, dispose };
};
const tool = (id: string) => ({
  type: "tool-call" as const,
  toolCallId: id,
  toolName: "search",
  args: {},
});
const ToolProbe = () => {
  const part = useAuiState((s) => s.part);
  return createComponent(Dynamic, {
    component: "span",
    class: "tool",
    get children() {
      const value = part();
      return value.type === "tool-call" ? value.toolName : "";
    },
  });
};

describe("MessagePrimitiveParts", () => {
  it("renders text parts by default and routes typed components in order", () => {
    const { runtime, setContent } = createTestRuntime();
    const { el } = mount(runtime, () => ({ "tool-call": ToolProbe }));
    flushTapSync(() =>
      setContent([
        { type: "text", text: "before " },
        tool("call-1"),
        { type: "text", text: " after" },
      ]),
    );
    expect(el.textContent).toBe("before search after");
    expect([...el.children].map((child) => child.tagName)).toEqual([
      "P",
      "SPAN",
      "P",
    ]);
    expect(el.querySelector("p")?.style.whiteSpace).toBe("pre-line");
  });

  it("keeps text rendering when only a default component is provided", () => {
    const { runtime, setContent } = createTestRuntime();
    const { el } = mount(runtime, () => ({
      default: () =>
        createComponent(Dynamic, {
          component: "span",
          class: "fallback",
          children: "[tool]",
        }),
    }));
    flushTapSync(() =>
      setContent([{ type: "text", text: "hello" }, tool("call-1")]),
    );
    expect(el.textContent).toBe("hello[tool]");
    expect(el.querySelector("span.fallback")).not.toBeNull();
  });

  it("warns once per unhandled part type across instances and remounts", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { runtime, setContent } = createTestRuntime();
    flushTapSync(() =>
      setContent([
        tool("call-1"),
        tool("call-2"),
        { type: "reasoning", text: "thinking" },
        { type: "text", text: "visible" },
      ]),
    );
    for (let i = 0; i < 2; i++) {
      const { el, dispose } = mount(runtime);
      expect(el.textContent).toBe("visible");
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Add components["tool-call"] or components.default.',
        ),
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Add components["reasoning"] or components.default.',
        ),
      );
      dispose();
    }
  });

  it("updates text and components live without remounting a stable part", () => {
    const { runtime, setContent } = createTestRuntime();
    const [components, setComponents] =
      createSignal<Parameters<typeof MessagePrimitiveParts>[0]["components"]>();
    const { el } = mount(runtime, components);
    flushTapSync(() => setContent([{ type: "text", text: "first\nline" }]));
    const paragraph = el.querySelector("p");
    flushTapSync(() => setContent([{ type: "text", text: "updated" }]));
    expect(el.querySelector("p")).toBe(paragraph);
    expect(paragraph?.textContent).toBe("updated");
    let mounts = 0;
    const Text = () => {
      mounts++;
      const part = useAuiState((s) => s.part);
      return createComponent(Dynamic, {
        component: "strong",
        get children() {
          const value = part();
          return value.type === "text" ? value.text : "";
        },
      });
    };
    setComponents({ text: Text });
    expect(el.querySelector("strong")?.textContent).toBe("updated");
    flushTapSync(() => setContent([{ type: "text", text: "streaming" }]));
    expect(el.querySelector("strong")?.textContent).toBe("streaming");
    expect(mounts).toBe(1);
    setComponents({});
    expect(el.querySelector("p")?.textContent).toBe("streaming");
  });

  it.each(["tool-call", "text", "default"] as const)(
    "preserves %s component state when an unrelated component changes",
    (slot) => {
      const { runtime, setContent } = createTestRuntime();
      flushTapSync(() =>
        setContent([
          slot === "text" ? { type: "text", text: "hello" } : tool("call-1"),
          { type: "reasoning", text: "thinking" },
        ]),
      );
      let mounts = 0;
      const Stateful = () => {
        mounts++;
        const [count, setCount] = createSignal(0);
        return createComponent(Dynamic, {
          component: "button",
          onClick: () => setCount((value) => value + 1),
          get children() {
            return count();
          },
        });
      };
      const [components, setComponents] = createSignal<
        Parameters<typeof MessagePrimitiveParts>[0]["components"]
      >({ [slot]: Stateful, reasoning: () => "before" });
      const { el } = mount(runtime, components);
      document.body.append(el);
      disposers.push(() => el.remove());
      const button = el.querySelector("button")!;
      button.click();
      expect(el.textContent).toBe("1before");
      expect(mounts).toBe(1);
      setComponents((previous) => ({
        ...previous,
        reasoning: () => "after",
      }));
      expect(mounts).toBe(1);
      expect(el.querySelector("button")).toBe(button);
      expect(el.textContent).toBe("1after");
      button.click();
      expect(button.textContent).toBe("2");
    },
  );

  it("keeps part instances and their scopes through reorders and removal", async () => {
    const { runtime, setContent } = createTestRuntime();
    let mounts = 0;
    let unmounts = 0;
    const Stateful = () => {
      mounts++;
      onCleanup(() => {
        unmounts++;
      });
      const part = useAuiState((s) => s.part);
      return createComponent(Dynamic, {
        component: "span",
        get children() {
          const value = part();
          return value.type === "tool-call" ? value.toolCallId : "";
        },
      });
    };
    const { el } = mount(runtime, () => ({ "tool-call": Stateful }));
    flushTapSync(() => setContent([tool("a"), tool("b"), tool("c")]));
    const [a, b, c] = el.querySelectorAll("span");
    flushTapSync(() => setContent([tool("c"), tool("b"), tool("a")]));
    await vi.waitFor(() =>
      expect([...el.querySelectorAll("span")]).toEqual([c, b, a]),
    );
    expect(el.textContent).toBe("cba");
    expect(mounts).toBe(3);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    flushTapSync(() => setContent([tool("c"), tool("a")]));
    await vi.waitFor(() =>
      expect([...el.querySelectorAll("span")]).toEqual([c, a]),
    );
    await Promise.resolve();
    expect(el.textContent).toBe("ca");
    expect(unmounts).toBe(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("replaces the component when a part changes type", () => {
    const { runtime, setContent } = createTestRuntime();
    const Reasoning: Component = () => {
      const part = useAuiState((s) => s.part);
      return createComponent(Dynamic, {
        component: "em",
        get children() {
          const value = part();
          return value.type === "reasoning" ? value.text : "";
        },
      });
    };
    const { el } = mount(runtime, () => ({ reasoning: Reasoning }));
    flushTapSync(() => setContent([{ type: "text", text: "first" }]));
    flushTapSync(() => setContent([{ type: "reasoning", text: "thinking" }]));
    expect(el.querySelector("p")).toBeNull();
    expect(el.querySelector("em")?.textContent).toBe("thinking");
  });
});
