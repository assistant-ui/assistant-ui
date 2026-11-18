import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createMemo, type Accessor, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import {
  ChainOfThoughtClient,
  RuntimeAdapter,
  type ChainOfThoughtPart,
  type PartState,
} from "@assistant-ui/core/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { ChainOfThoughtPrimitiveParts } from "./ChainOfThoughtPrimitiveParts";

const createReasoningRuntime = (texts: readonly string[]) => {
  let content: ThreadMessageLike["content"] = texts.map((text) => ({
    type: "reasoning",
    text,
  }));
  const makeAdapter = () => ({
    messages: [{ id: "a0", role: "assistant" as const, content }],
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    setParts: (parts: ThreadMessageLike["content"]) => {
      content = parts;
      core.setAdapter(makeAdapter());
    },
  };
};

const ChainOfThoughtHost = (props: {
  startIndex?: number;
  beforeLookup?: () => void;
  children?: JSX.Element;
}) => {
  const aui = useAui();
  const parts = useAuiState((s) => s.message.parts);
  const startIndex = props.startIndex ?? 0;
  const config = createMemo(() =>
    AuiConfig({
      chainOfThought: ChainOfThoughtClient({
        parts: parts().slice(startIndex) as readonly ChainOfThoughtPart[],
        getMessagePart: ({ index }) => {
          props.beforeLookup?.();
          return aui.message.part({ index: startIndex + index });
        },
      }),
    }),
  );
  return createComponent(AuiProvider, {
    get config() {
      return config();
    },
    extends: aui,
    get children() {
      return props.children;
    },
  });
};

const CollapsedProbe = () => {
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  return createComponent(Dynamic, {
    component: "button",
    class: "expand",
    onClick: () => aui.chainOfThought.setCollapsed(false),
    get children() {
      return String(collapsed());
    },
  });
};

const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});

const mountParts = (
  initial: readonly string[],
  renderPart: (part: Accessor<PartState>) => JSX.Element = (part) =>
    createComponent(Dynamic, {
      component: "li",
      class: "part",
      get children() {
        const value = part();
        return value.type === "reasoning" ? value.text : value.type;
      },
    }),
  hostProps: Omit<Parameters<typeof ChainOfThoughtHost>[0], "children"> = {},
) => {
  const { runtime, setParts } = createReasoningRuntime(initial);
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(Dynamic, {
            component: "ul",
            get children() {
              return createComponent(ThreadPrimitiveMessages, {
                get children() {
                  return createComponent(ChainOfThoughtHost, {
                    ...hostProps,
                    get children() {
                      return [
                        createComponent(ChainOfThoughtPrimitiveParts, {
                          children: renderPart,
                        }),
                        createComponent(CollapsedProbe, {}),
                      ];
                    },
                  });
                },
              });
            },
          });
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return {
    el,
    setParts,
    setTexts: (texts: readonly string[]) =>
      setParts(texts.map((text) => ({ type: "reasoning", text }))),
  };
};

const partTexts = (el: HTMLElement) =>
  [...el.querySelectorAll("li.part")].map((li) => li.textContent);

describe("ChainOfThoughtPrimitiveParts", () => {
  it("keeps tool-call child state with its part when chain parts swap", async () => {
    const mounts = vi.fn();
    const { el, setParts } = mountParts([], (part) => {
      mounts();
      const initial = part();
      return createComponent(Dynamic, {
        component: "li",
        class: "part",
        children: initial.type === "tool-call" ? initial.toolName : "",
      });
    });
    const first = {
      type: "tool-call" as const,
      toolCallId: "call-a",
      toolName: "alpha",
      args: {},
    };
    const second = { ...first, toolCallId: "call-b", toolName: "beta" };

    flushTapSync(() => setParts([first, second]));
    await vi.waitFor(() => expect(partTexts(el)).toEqual(["alpha", "beta"]));
    expect(mounts).toHaveBeenCalledTimes(2);

    flushTapSync(() => setParts([second, first]));
    await vi.waitFor(() => expect(partTexts(el)).toEqual(["beta", "alpha"]));
    expect(mounts).toHaveBeenCalledTimes(2);
  });

  it("renders one child invocation per part with its live state", async () => {
    const renderPart = vi.fn((part: Accessor<PartState>) => {
      expect(useAuiState((s) => s.part)()).toBe(part());
      return createComponent(Dynamic, {
        component: "li",
        class: "part",
        get children() {
          const value = part();
          return value.type === "reasoning" ? value.text : value.type;
        },
      });
    });
    const { el, setTexts } = mountParts(
      ["prefix", "alpha", "beta"],
      renderPart,
      {
        startIndex: 1,
      },
    );
    expect(partTexts(el)).toEqual(["alpha", "beta"]);
    expect(renderPart).toHaveBeenCalledTimes(2);

    flushTapSync(() => setTexts(["prefix", "updated", "beta"]));
    await vi.waitFor(() => expect(partTexts(el)).toEqual(["updated", "beta"]));
    expect(renderPart).toHaveBeenCalledTimes(2);
  });

  it("renders regardless of the collapsed state, matching the React primitive", () => {
    const { el } = mountParts(["alpha"]);
    const button = el.querySelector<HTMLButtonElement>("button.expand")!;
    expect(button.textContent).toBe("true");
    expect(partTexts(el)).toEqual(["alpha"]);

    flushTapSync(() => button.click());
    expect(button.textContent).toBe("false");
    expect(partTexts(el)).toEqual(["alpha"]);
  });

  it("follows a parts shrink and regrowth without crashing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { el, setTexts } = mountParts(["alpha", "beta"]);
    expect(partTexts(el)).toEqual(["alpha", "beta"]);

    flushTapSync(() => setTexts(["alpha"]));
    await vi.waitFor(() => expect(partTexts(el)).toEqual(["alpha"]));

    flushTapSync(() => setTexts(["alpha", "gamma"]));
    await vi.waitFor(() => expect(partTexts(el)).toEqual(["alpha", "gamma"]));

    const logged = error.mock.calls.map((call) => call.map(String).join(" "));
    for (const message of logged) {
      expect(message).toContain("(ignore if recovered)");
    }
    expect(logged.join("\n")).not.toContain(
      "ChainOfThoughtPartByIndexProvider",
    );
  });

  it("keeps a part usable through a throwing lookup and recovers", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const beforeLookup = vi.fn();
    const { el, setTexts } = mountParts(["alpha"], undefined, { beforeLookup });
    expect(partTexts(el)).toEqual(["alpha"]);

    beforeLookup.mockImplementation(() => {
      throw new Error("Part lookup is temporarily unavailable.");
    });
    flushTapSync(() => setTexts(["beta"]));
    expect(partTexts(el)).toEqual(["beta"]);

    beforeLookup.mockReset();
    flushTapSync(() => setTexts(["gamma"]));
    await vi.waitFor(() => expect(partTexts(el)).toEqual(["gamma"]));
    expect(error).not.toHaveBeenCalled();
  });
});
