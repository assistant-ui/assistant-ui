import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, mergeProps } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { ChainOfThoughtClient } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { ChainOfThoughtPrimitiveAccordionTrigger } from "./ChainOfThoughtPrimitiveAccordionTrigger";

const disposers: (() => void)[] = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));

const mountTrigger = (
  props: Parameters<typeof ChainOfThoughtPrimitiveAccordionTrigger>[0] = {},
) => {
  let client!: AssistantClient;
  const StateProbe = () => {
    client = useAui();
    const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
    return createComponent(Dynamic, {
      component: "span",
      class: "collapsed",
      get children() {
        return String(collapsed());
      },
    });
  };
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({
          chainOfThought: ChainOfThoughtClient({
            parts: [
              {
                type: "reasoning",
                text: "thinking",
                status: { type: "complete" },
              },
            ],
            getMessagePart: () => {
              throw new Error("Part access is not needed by this test.");
            },
          }),
        }),
        get children() {
          return [
            createComponent(
              ChainOfThoughtPrimitiveAccordionTrigger,
              mergeProps({ children: "Toggle" }, props),
            ),
            createComponent(StateProbe, {}),
          ];
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return { el, button: el.querySelector("button")!, client: () => client };
};

describe("ChainOfThoughtPrimitiveAccordionTrigger", () => {
  it("toggles the collapsed state and aria-expanded in both directions", () => {
    const { el, button } = mountTrigger();
    expect(button.type).toBe("button");
    expect(button.textContent).toBe("Toggle");
    expect(el.querySelector(".collapsed")?.textContent).toBe("true");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    flushTapSync(() => button.click());
    expect(el.querySelector(".collapsed")?.textContent).toBe("false");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    flushTapSync(() => button.click());
    expect(el.querySelector(".collapsed")?.textContent).toBe("true");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it.each([false, true])(
    "runs the caller first and honors its veto (bound=%s)",
    (bound) => {
      const [veto, setVeto] = createSignal(true);
      const handler = vi.fn((event: MouseEvent) => {
        expect(event.cancelable).toBe(true);
        expect(client().chainOfThought.getState().collapsed).toBe(true);
        if (veto()) event.preventDefault();
      });
      const boundHandler = vi.fn((data: string, event: MouseEvent) => {
        expect(data).toBe("caller");
        handler(event);
      });
      const { button, client } = mountTrigger({
        onClick: bound ? [boundHandler, "caller"] : handler,
      });
      flushTapSync(() => button.click());
      expect(handler).toHaveBeenCalledOnce();
      expect(client().chainOfThought.getState().collapsed).toBe(true);
      setVeto(false);
      flushTapSync(() => button.click());
      expect(client().chainOfThought.getState().collapsed).toBe(false);
    },
  );

  it("honors live disabled state even if the DOM is forcibly enabled", () => {
    const [disabled, setDisabled] = createSignal(true);
    const { button, client } = mountTrigger({
      get disabled() {
        return disabled();
      },
    });
    expect(button.disabled).toBe(true);
    flushTapSync(() => button.click());
    expect(client().chainOfThought.getState().collapsed).toBe(true);
    button.disabled = false;
    flushTapSync(() => button.click());
    expect(client().chainOfThought.getState().collapsed).toBe(true);
    setDisabled(false);
    flushTapSync(() => button.click());
    expect(client().chainOfThought.getState().collapsed).toBe(false);
  });

  it("forwards refs and live children and attributes, and follows external state changes", () => {
    const ref = vi.fn();
    const [label, setLabel] = createSignal("Toggle");
    const { button, client } = mountTrigger({
      ref,
      class: "toggle",
      "aria-expanded": true,
      get "aria-label"() {
        return label();
      },
      get children() {
        return label();
      },
    });
    expect(ref.mock.calls[0]?.[0]).toBe(button);
    expect(button.className).toBe("toggle");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    setLabel("Expand reasoning");
    expect(button.textContent).toBe("Expand reasoning");
    expect(button.getAttribute("aria-label")).toBe("Expand reasoning");
    flushTapSync(() => client().chainOfThought.setCollapsed(false));
    expect(button.getAttribute("aria-expanded")).toBe("true");
    flushTapSync(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
