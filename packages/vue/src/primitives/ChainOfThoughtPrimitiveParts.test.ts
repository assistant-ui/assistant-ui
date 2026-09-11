import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, createApp, defineComponent, h, nextTick } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import {
  ChainOfThoughtClient,
  RuntimeAdapter,
  type ChainOfThoughtPart,
  type PartState,
} from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { ChainOfThoughtPrimitiveParts } from "./ChainOfThoughtPrimitiveParts";

type DemoMessage = { id: string; texts: readonly string[] };

const convertDemoMessage = (message: DemoMessage) => ({
  id: message.id,
  role: "assistant" as const,
  content: message.texts.map((text) => ({
    type: "reasoning" as const,
    text,
  })),
});

const createReasoningRuntime = (initial: readonly string[]) => {
  let messages: DemoMessage[] = [{ id: "a0", texts: initial }];
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning: false,
    convertMessage: convertDemoMessage,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const setTexts = (texts: readonly string[]) => {
    messages = [{ id: "a0", texts }];
    core.setAdapter(makeAdapter());
  };
  return { runtime, setTexts };
};

const CollapsedProbe = defineComponent({
  setup() {
    const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
    return () => h("span", { class: "collapsed" }, String(collapsed.value));
  },
});

const ExpandButton = defineComponent({
  setup() {
    const aui = useAui();
    return () =>
      h(
        "button",
        {
          class: "expand",
          onClick: () => aui.chainOfThought.setCollapsed(false),
        },
        "expand",
      );
  },
});

const ChainOfThoughtHost = defineComponent({
  setup(_, { slots }) {
    const aui = useAui();
    const parts = useAuiState((s) => s.message.parts);
    const config = computed(() =>
      AuiConfig({
        chainOfThought: ChainOfThoughtClient({
          parts: parts.value as readonly ChainOfThoughtPart[],
          getMessagePart: ({ index }) => aui.message.part({ index }),
        }),
      }),
    );
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});

const mountParts = (initial: readonly string[]) => {
  const { runtime, setTexts } = createReasoningRuntime(initial);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          {
            default: () =>
              h("ul", [
                h(ThreadPrimitiveMessages, null, {
                  default: () =>
                    h(ChainOfThoughtHost, null, {
                      default: () => [
                        h(ChainOfThoughtPrimitiveParts, null, {
                          default: ({ part }: { part: PartState }) => [
                            h(
                              "li",
                              { class: "part" },
                              part.type === "reasoning" ? part.text : part.type,
                            ),
                          ],
                        }),
                        h(CollapsedProbe),
                        h(ExpandButton),
                      ],
                    }),
                }),
              ]),
          },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, setTexts, unmount: () => app.unmount() };
};

const partTexts = (el: HTMLElement) =>
  [...el.querySelectorAll("li.part")].map((li) => li.textContent);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChainOfThoughtPrimitiveParts", () => {
  it("renders one slot invocation per part with its state", async () => {
    const { el, unmount } = mountParts(["alpha", "beta"]);

    await vi.waitFor(async () => {
      await nextTick();
      expect(partTexts(el)).toEqual(["alpha", "beta"]);
    });

    unmount();
  });

  it("renders regardless of the collapsed state, matching the React primitive", async () => {
    const { el, unmount } = mountParts(["alpha"]);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.collapsed")?.textContent).toBe("true");
      expect(partTexts(el)).toEqual(["alpha"]);
    });

    el.querySelector<HTMLButtonElement>("button.expand")!.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.collapsed")?.textContent).toBe("false");
      expect(partTexts(el)).toEqual(["alpha"]);
    });

    unmount();
  });

  it("follows a parts shrink and regrowth without crashing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { el, setTexts, unmount } = mountParts(["alpha", "beta"]);

    await vi.waitFor(async () => {
      await nextTick();
      expect(partTexts(el)).toEqual(["alpha", "beta"]);
    });

    setTexts(["alpha"]);
    await vi.waitFor(async () => {
      await nextTick();
      expect(partTexts(el)).toEqual(["alpha"]);
    });

    setTexts(["alpha", "gamma"]);
    await vi.waitFor(async () => {
      await nextTick();
      expect(partTexts(el)).toEqual(["alpha", "gamma"]);
    });

    const logged = error.mock.calls.map((call) => call.map(String).join(" "));
    for (const message of logged) {
      expect(message).toContain("(ignore if recovered)");
    }
    expect(logged.join("\n")).not.toContain(
      "ChainOfThoughtPartByIndexProvider",
    );

    unmount();
    error.mockRestore();
  });
});
