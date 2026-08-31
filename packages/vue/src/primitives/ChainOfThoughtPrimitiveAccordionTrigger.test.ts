import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import {
  ChainOfThoughtClient,
  type ChainOfThoughtPart,
} from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ChainOfThoughtPrimitiveAccordionTrigger } from "./ChainOfThoughtPrimitiveAccordionTrigger";

const parts: readonly ChainOfThoughtPart[] = [
  { type: "reasoning", text: "thinking", status: { type: "complete" } },
];

const StateProbe = defineComponent({
  setup() {
    const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
    return () => h("span", { class: "collapsed" }, String(collapsed.value));
  },
});

const mountTrigger = (props: Record<string, unknown> = {}) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          {
            config: AuiConfig({
              chainOfThought: ChainOfThoughtClient({
                parts,
                getMessagePart: () => {
                  throw new Error("Part access is not needed by this test.");
                },
              }),
            }),
          },
          {
            default: () =>
              h("div", [
                h(ChainOfThoughtPrimitiveAccordionTrigger, props, {
                  default: () => "Toggle",
                }),
                h(StateProbe),
              ]),
          },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

describe("ChainOfThoughtPrimitiveAccordionTrigger", () => {
  it("toggles the collapsed state", async () => {
    const { el, unmount } = mountTrigger();
    const button = el.querySelector<HTMLButtonElement>("button")!;

    expect(el.querySelector("span.collapsed")?.textContent).toBe("true");
    button.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.collapsed")?.textContent).toBe("false");
    });
    button.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.collapsed")?.textContent).toBe("true");
    });

    unmount();
  });

  it("respects caller vetoes", async () => {
    const { el, unmount } = mountTrigger({
      onClick: (event: MouseEvent) => event.preventDefault(),
    });

    el.querySelector<HTMLButtonElement>("button")!.click();
    await nextTick();
    expect(el.querySelector("span.collapsed")?.textContent).toBe("true");

    unmount();
  });

  it("stays disabled when the disabled attribute is set", async () => {
    const { el, unmount } = mountTrigger({ disabled: true });
    const button = el.querySelector<HTMLButtonElement>("button")!;

    expect(button.disabled).toBe(true);
    flushTapSync(() => button.click());
    await nextTick();
    expect(el.querySelector("span.collapsed")?.textContent).toBe("true");

    button.disabled = false;
    flushTapSync(() => button.click());
    await nextTick();
    expect(el.querySelector("span.collapsed")?.textContent).toBe("true");

    unmount();
  });
});
