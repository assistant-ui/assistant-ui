import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { ChainOfThoughtAccordionTrigger } from "./ChainOfThoughtAccordionTrigger";

const h = vi.hoisted(() => ({
  setCollapsed: vi.fn<(collapsed: boolean) => void>(),
  state: { chainOfThought: { collapsed: true } },
}));

vi.mock("@assistant-ui/store", () => {
  const chainOfThought = Object.assign(() => chainOfThought, {
    setCollapsed: h.setCollapsed,
  });
  const aui = { chainOfThought };
  return {
    useAui: () => aui,
    useAuiState: (scope: string, selector?: (s: never) => unknown) => {
      const state = (h.state as Record<string, unknown>)[scope];
      return selector ? selector(state as never) : state;
    },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ChainOfThoughtAccordionTrigger", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.setCollapsed.mockReset();
    h.state.chainOfThought.collapsed = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async () => {
    await act(async () => {
      root.render(
        <ChainOfThoughtAccordionTrigger testID="trigger">
          <Text>toggle</Text>
        </ChainOfThoughtAccordionTrigger>,
      );
    });
    return container.querySelector(
      '[data-testid="trigger"]',
    ) as HTMLElement | null;
  };

  const press = async (el: HTMLElement) => {
    await act(async () => {
      el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
  };

  it("renders the trigger with its children", async () => {
    const el = await mount();
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe("toggle");
  });

  it("expands (sets collapsed false) when currently collapsed", async () => {
    h.state.chainOfThought.collapsed = true;
    const el = await mount();
    await press(el!);
    expect(h.setCollapsed).toHaveBeenCalledTimes(1);
    expect(h.setCollapsed).toHaveBeenCalledWith(false);
  });

  it("collapses (sets collapsed true) when currently expanded", async () => {
    h.state.chainOfThought.collapsed = false;
    const el = await mount();
    await press(el!);
    expect(h.setCollapsed).toHaveBeenCalledTimes(1);
    expect(h.setCollapsed).toHaveBeenCalledWith(true);
  });
});
