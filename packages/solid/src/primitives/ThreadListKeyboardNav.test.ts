import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, For, Show, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadListItemByIndexProvider } from "./threadList";
import { ThreadListItemPrimitiveRoot } from "./ThreadListItemPrimitiveRoot";
import { ThreadListItemPrimitiveTrigger } from "./ThreadListItemPrimitiveTrigger";
import { ThreadListPrimitiveRoot } from "./ThreadListPrimitiveRoot";

type Message = { id: string; role: "user"; text: string };

const createRuntime = () => {
  let mainThreadId = "first";
  let core!: ExternalStoreRuntimeCore;
  const onSwitchToThread = vi.fn((threadId: string) => {
    mainThreadId = threadId;
    core.setAdapter(createAdapter());
  });
  const createAdapter = (): ExternalStoreAdapter<Message> => ({
    messages: [],
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: mainThreadId,
        threads: ["first", "second", "third"].map((id) => ({
          status: "regular" as const,
          id,
          title: id,
        })),
        onSwitchToThread,
      },
    },
  });
  core = new ExternalStoreRuntimeCore(createAdapter());
  return { runtime: new AssistantRuntimeImpl(core), onSwitchToThread };
};

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

const mount = (runtime: AssistantRuntimeImpl, view: () => JSX.Element) => {
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(view, {});
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return el;
};

const row = (
  index: number,
  rootProps: JSX.HTMLAttributes<HTMLDivElement> = {},
  triggerProps: JSX.ButtonHTMLAttributes<HTMLButtonElement> = {},
) =>
  createComponent(ThreadListItemByIndexProvider, {
    index,
    get children() {
      return createComponent(ThreadListItemPrimitiveRoot, {
        class: "item",
        ...rootProps,
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            ...triggerProps,
            children: `item ${index}`,
          });
        },
      });
    },
  });

const keydown = (element: HTMLElement, key: string) =>
  element.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }),
  );

const buttons = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLButtonElement>("button"),
];

describe("thread list keyboard navigation", () => {
  it("moves through triggers in DOM order without wrapping", () => {
    const { runtime } = createRuntime();
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        class: "list",
        get children() {
          return [0, 1, 2].map((index) => row(index));
        },
      }),
    );
    const [first, second, third] = buttons(el);
    const list = el.querySelector<HTMLElement>(".list")!;
    const [firstItem, , thirdItem] = el.querySelectorAll<HTMLElement>(".item");
    list.insertBefore(thirdItem!, firstItem!);
    third!.focus();
    expect(keydown(third!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(first);
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(second);
    expect(keydown(second!, "ArrowDown")).toBe(true);
    expect(document.activeElement).toBe(second);
    expect(keydown(first!, "ArrowUp")).toBe(false);
    expect(document.activeElement).toBe(third);
    expect(keydown(third!, "ArrowUp")).toBe(true);
    expect(document.activeElement).toBe(third);
  });

  it("skips disabled triggers in both directions without wrapping", () => {
    const { runtime, onSwitchToThread } = createRuntime();
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        get children() {
          return [0, 1, 2].map((index) =>
            row(index, {}, { disabled: index === 1 }),
          );
        },
      }),
    );
    const [first, , third] = buttons(el);
    first!.focus();
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(third);
    expect(keydown(third!, "ArrowDown")).toBe(true);
    expect(document.activeElement).toBe(third);
    expect(keydown(third!, "ArrowUp")).toBe(false);
    expect(document.activeElement).toBe(first);
    expect(keydown(first!, "ArrowUp")).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(onSwitchToThread).not.toHaveBeenCalled();
  });

  it("lets a caller veto collection navigation with a bound handler", () => {
    const { runtime } = createRuntime();
    const handler = vi.fn((_data: string, event: KeyboardEvent) =>
      event.preventDefault(),
    );
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        get children() {
          return [0, 1].map((index) =>
            row(index, { onKeyDown: [handler, "veto"] }),
          );
        },
      }),
    );
    const [first] = buttons(el);
    first!.focus();
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(first);
    expect(handler).toHaveBeenCalledWith("veto", expect.any(KeyboardEvent));
  });

  it("tracks the main thread on the item root", () => {
    const { runtime, onSwitchToThread } = createRuntime();
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        get children() {
          return [0, 1].map((index) => row(index));
        },
      }),
    );
    const items = el.querySelectorAll<HTMLElement>(".item");
    expect(items[0]!.getAttribute("data-active")).toBe("true");
    expect(items[0]!.getAttribute("aria-current")).toBe("true");
    flushTapSync(() => buttons(el)[1]!.click());
    expect(onSwitchToThread).toHaveBeenCalledWith("second");
    expect(items[1]!.getAttribute("data-active")).toBe("true");
    expect(items[1]!.getAttribute("aria-current")).toBe("true");
    expect(items[0]!.hasAttribute("data-active")).toBe(false);
    expect(items[0]!.hasAttribute("aria-current")).toBe(false);
  });

  it("keeps the trigger working without either root", () => {
    const { runtime, onSwitchToThread } = createRuntime();
    const el = mount(runtime, () =>
      [0, 1].map((index) =>
        createComponent(ThreadListItemByIndexProvider, {
          index,
          get children() {
            return createComponent(ThreadListItemPrimitiveTrigger, {
              children: `item ${index}`,
            });
          },
        }),
      ),
    );
    flushTapSync(() => buttons(el)[1]!.click());
    expect(onSwitchToThread).toHaveBeenCalledWith("second");
  });

  it("unregisters a trigger when its item unmounts", () => {
    const { runtime } = createRuntime();
    const [showSecond, setShowSecond] = createSignal(true);
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        get children() {
          return createComponent(For<readonly number[], JSX.Element>, {
            get each() {
              return [0, 1, 2].filter((index) => index !== 1 || showSecond());
            },
            children: (index) => row(index),
          });
        },
      }),
    );
    setShowSecond(false);
    const [first, third] = buttons(el);
    first!.focus();
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(third);
  });

  it("leaves unrelated keys and controls inside an item alone", () => {
    const { runtime } = createRuntime();
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        get children() {
          return [
            row(0),
            createComponent(ThreadListItemByIndexProvider, {
              index: 1,
              get children() {
                return createComponent(ThreadListItemPrimitiveRoot, {
                  get children() {
                    return [
                      createComponent(ThreadListItemPrimitiveTrigger, {}),
                      createComponent(Dynamic, { component: "input" }),
                    ];
                  },
                });
              },
            }),
          ];
        },
      }),
    );
    const first = buttons(el)[0]!;
    first.focus();
    expect(keydown(first, "Home")).toBe(true);
    expect(document.activeElement).toBe(first);
    const input = el.querySelector("input")!;
    input.focus();
    expect(keydown(input, "ArrowUp")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("allows item roots without a collection or a mounted trigger", () => {
    const { runtime } = createRuntime();
    const [showTrigger, setShowTrigger] = createSignal(true);
    const el = mount(runtime, () =>
      createComponent(ThreadListItemByIndexProvider, {
        index: 0,
        get children() {
          return createComponent(ThreadListItemPrimitiveRoot, {
            get children() {
              return createComponent(Show, {
                keyed: true,
                get when() {
                  return showTrigger();
                },
                get children() {
                  return createComponent(ThreadListItemPrimitiveTrigger, {});
                },
              });
            },
          });
        },
      }),
    );
    const first = buttons(el)[0]!;
    first.focus();
    expect(keydown(first, "ArrowDown")).toBe(true);
    setShowTrigger(false);
    expect(buttons(el)).toHaveLength(0);
    expect(keydown(el.firstElementChild as HTMLElement, "ArrowDown")).toBe(
      true,
    );
  });

  it("keeps nested collections isolated", () => {
    const { runtime } = createRuntime();
    const el = mount(runtime, () =>
      createComponent(ThreadListPrimitiveRoot, {
        get children() {
          return [
            row(0),
            createComponent(ThreadListPrimitiveRoot, {
              get children() {
                return row(1);
              },
            }),
            row(2),
          ];
        },
      }),
    );
    const [first, second, third] = buttons(el);
    first!.focus();
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(third);
    second!.focus();
    expect(keydown(second!, "ArrowDown")).toBe(true);
    expect(document.activeElement).toBe(second);
  });
});

describe("application shortcuts in Solid thread lists", () => {
  it.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)(
    "leaves %s + ArrowDown available to an ancestor shortcut",
    (modifier) => {
      const { runtime } = createRuntime();
      const handled = vi.fn();
      const el = mount(runtime, () =>
        createComponent(Dynamic, {
          component: "section",
          get children() {
            return createComponent(ThreadListPrimitiveRoot, {
              get children() {
                return [0, 1].map((index) => row(index));
              },
            });
          },
        }),
      );
      el.querySelector("section")!.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || !event[modifier]) return;
        handled();
        event.preventDefault();
      });
      const [first] = buttons(el);
      first!.focus();
      first!.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "ArrowDown",
          [modifier]: true,
        }),
      );
      expect(handled).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(first);
    },
  );
});
