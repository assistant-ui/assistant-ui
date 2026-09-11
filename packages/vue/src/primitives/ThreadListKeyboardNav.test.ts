import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
} from "vue";
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
  return {
    runtime: new AssistantRuntimeImpl(core),
    onSwitchToThread,
  };
};

const mount = (runtime: AssistantRuntimeImpl, view: Component) => {
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
  document.body.append(el);
  app.mount(el);
  return {
    el,
    unmount: () => {
      app.unmount();
      el.remove();
    },
  };
};

const keydown = (element: HTMLElement, key: string) =>
  element.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }),
  );

const buttons = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLButtonElement>("button"),
];

describe("thread list keyboard navigation", () => {
  it("moves through triggers in DOM order without wrapping", async () => {
    const { runtime } = createRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadListPrimitiveRoot,
          { class: "list" },
          {
            default: () =>
              [0, 1, 2].map((index) =>
                h(
                  ThreadListItemByIndexProvider,
                  { index, key: index },
                  {
                    default: () =>
                      h(
                        ThreadListItemPrimitiveRoot,
                        { class: "item" },
                        {
                          default: () =>
                            h(ThreadListItemPrimitiveTrigger, null, {
                              default: () => `item ${index}`,
                            }),
                        },
                      ),
                  },
                ),
              ),
          },
        ),
    });
    const { el, unmount } = mount(runtime, View);

    await nextTick();
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

    unmount();
  });

  it("lets a caller veto collection navigation", async () => {
    const { runtime } = createRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadListPrimitiveRoot, null, {
          default: () =>
            [0, 1].map((index) =>
              h(
                ThreadListItemByIndexProvider,
                { index, key: index },
                {
                  default: () =>
                    h(
                      ThreadListItemPrimitiveRoot,
                      {
                        onKeydown: (event: KeyboardEvent) =>
                          event.preventDefault(),
                      },
                      {
                        default: () =>
                          h(ThreadListItemPrimitiveTrigger, null, {
                            default: () => `item ${index}`,
                          }),
                      },
                    ),
                },
              ),
            ),
        }),
    });
    const { el, unmount } = mount(runtime, View);

    await nextTick();
    const [first] = buttons(el);
    first!.focus();
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(first);

    unmount();
  });

  it("tracks the main thread on the item root", async () => {
    const { runtime, onSwitchToThread } = createRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadListPrimitiveRoot, null, {
          default: () =>
            [0, 1].map((index) =>
              h(
                ThreadListItemByIndexProvider,
                { index, key: index },
                {
                  default: () =>
                    h(
                      ThreadListItemPrimitiveRoot,
                      { class: "item" },
                      {
                        default: () =>
                          h(ThreadListItemPrimitiveTrigger, null, {
                            default: () => `item ${index}`,
                          }),
                      },
                    ),
                },
              ),
            ),
        }),
    });
    const { el, unmount } = mount(runtime, View);

    await nextTick();
    const items = el.querySelectorAll<HTMLElement>(".item");
    expect(items[0]!.getAttribute("data-active")).toBe("true");
    expect(items[0]!.getAttribute("aria-current")).toBe("true");
    buttons(el)[1]!.click();
    await vi.waitFor(() => {
      expect(onSwitchToThread).toHaveBeenCalledWith("second");
      expect(items[1]!.getAttribute("data-active")).toBe("true");
      expect(items[1]!.getAttribute("aria-current")).toBe("true");
    });
    expect(items[0]!.hasAttribute("data-active")).toBe(false);
    expect(items[0]!.hasAttribute("aria-current")).toBe(false);

    unmount();
  });

  it("keeps the trigger working without either root", async () => {
    const { runtime, onSwitchToThread } = createRuntime();
    const View = defineComponent({
      setup: () => () =>
        [0, 1].map((index) =>
          h(
            ThreadListItemByIndexProvider,
            { index, key: index },
            {
              default: () =>
                h(ThreadListItemPrimitiveTrigger, null, {
                  default: () => `item ${index}`,
                }),
            },
          ),
        ),
    });
    const { el, unmount } = mount(runtime, View);

    await nextTick();
    buttons(el)[1]!.click();
    await vi.waitFor(() => {
      expect(onSwitchToThread).toHaveBeenCalledWith("second");
    });

    unmount();
  });

  it("unregisters a trigger when its item unmounts", async () => {
    const { runtime } = createRuntime();
    const showSecond = ref(true);
    const View = defineComponent({
      setup: () => () =>
        h(ThreadListPrimitiveRoot, null, {
          default: () =>
            [0, 1, 2]
              .filter((index) => index !== 1 || showSecond.value)
              .map((index) =>
                h(
                  ThreadListItemByIndexProvider,
                  { index, key: index },
                  {
                    default: () =>
                      h(ThreadListItemPrimitiveRoot, null, {
                        default: () =>
                          h(ThreadListItemPrimitiveTrigger, null, {
                            default: () => `item ${index}`,
                          }),
                      }),
                  },
                ),
              ),
        }),
    });
    const { el, unmount } = mount(runtime, View);

    await nextTick();
    showSecond.value = false;
    await nextTick();
    const [first, third] = buttons(el);
    first!.focus();
    expect(keydown(first!, "ArrowDown")).toBe(false);
    expect(document.activeElement).toBe(third);

    unmount();
  });
});
