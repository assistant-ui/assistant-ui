// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));

vi.mock("sonner", async (importOriginal) => {
  const original = await importOriginal<typeof import("sonner")>();
  return {
    ...original,
    toast: Object.assign(original.toast, { success: toastSuccess }),
  };
});

const STORAGE_KEY = "aui-elements-cart";

const loadCart = async () => {
  vi.resetModules();
  const [{ CartToggle }, { ElementsCart }, { AssistantPanelProvider }, store] =
    await Promise.all([
      import("./cart-toggle"),
      import("./elements-cart"),
      import("../../docs/assistant/context"),
      import("./store"),
    ]);
  return { CartToggle, ElementsCart, AssistantPanelProvider, ...store };
};

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("CartToggle", () => {
  it("adds with a toast whose action opens the cart, and removes on the second press", async () => {
    const { CartToggle, useCartOpen, setCartOpen } = await loadCart();
    render(<CartToggle slug="loading-state" title="Loader" />);

    const toggle = screen.getByRole("button", { name: "Add Loader to cart" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(stored()).toEqual(["loading-state"]);
    expect(renderHook(() => useCartOpen()).result.current).toBe(false);
    expect(toastSuccess.mock.calls[0]![0]).toBe("Loader added to cart.");
    act(() => toastSuccess.mock.calls[0]![1].action.onClick());
    expect(renderHook(() => useCartOpen()).result.current).toBe(true);

    act(() => setCartOpen(false));
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(stored()).toEqual([]);
    expect(renderHook(() => useCartOpen()).result.current).toBe(false);
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("cart store", () => {
  it("restores stored slugs and drops entries it cannot read", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["loading-state", { slug: "broken" }, 5, "loading-state"]),
    );
    const { useCartSlugs } = await loadCart();

    expect(renderHook(() => useCartSlugs()).result.current).toEqual([
      "loading-state",
    ]);
  });

  it("reads storage again when a consumer subscribes after the last one left", async () => {
    const { useCartSlugs } = await loadCart();
    const first = renderHook(() => useCartSlugs());
    expect(first.result.current).toEqual([]);
    first.unmount();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(["tool-call"]));

    expect(renderHook(() => useCartSlugs()).result.current).toEqual([
      "tool-call",
    ]);
  });
});

describe("ElementsCart", () => {
  it("lists only elements the registry still has and installs a shared registry item once", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["composer", "removed-element", "composer-slash"]),
    );
    const { ElementsCart, AssistantPanelProvider } = await loadCart();
    render(
      <AssistantPanelProvider>
        <ElementsCart
          elements={{
            composer: { title: "Composer", registryName: "elements-composer" },
            "composer-slash": {
              title: "Slash commands",
              registryName: "elements-composer",
            },
          }}
        />
      </AssistantPanelProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open cart, 2 elements" }),
    );

    expect(screen.getByRole("link", { name: /^Composer/ })).toBeDefined();
    expect(screen.queryByText(/removed-element/)).toBeNull();
    const command = document.querySelector("figure pre")!.textContent!;
    expect(command.match(/@assistant-ui\/elements-composer/g)).toHaveLength(1);
  });

  it("closes when Ask AI opens and does not reopen after the page is left", async () => {
    const { ElementsCart, AssistantPanelProvider, useCartOpen, setCartOpen } =
      await loadCart();
    const { useAssistantPanel } = await import("../../docs/assistant/context");
    let openAssistant = () => {};
    function Probe() {
      const { setOpen } = useAssistantPanel();
      openAssistant = () => setOpen(true);
      return null;
    }
    const view = render(
      <AssistantPanelProvider>
        <Probe />
        <ElementsCart elements={{}} />
      </AssistantPanelProvider>,
    );

    act(() => setCartOpen(true));
    act(() => openAssistant());
    expect(renderHook(() => useCartOpen()).result.current).toBe(false);

    act(() => setCartOpen(true));
    view.unmount();
    expect(renderHook(() => useCartOpen()).result.current).toBe(false);
  });
});
