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

const loader = {
  slug: "loading-state",
  title: "Loader",
  registryName: "elements-loading-state",
};

const loadCart = async () => {
  vi.resetModules();
  const [{ CartToggle }, store] = await Promise.all([
    import("./cart-toggle"),
    import("./store"),
  ]);
  return { CartToggle, ...store };
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("CartToggle", () => {
  it("adds with a toast whose action opens the cart, and removes on the second press", async () => {
    const { CartToggle, CART_STORAGE_KEY, useCartOpen, setCartOpen } =
      await loadCart();
    render(<CartToggle item={loader} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Loader to cart" }));
    const pressed = screen.getByRole("button", {
      name: "Remove Loader from cart",
    });
    expect(pressed.getAttribute("aria-pressed")).toBe("true");
    expect(renderHook(() => useCartOpen()).result.current).toBe(false);
    expect(toastSuccess.mock.calls[0]![0]).toBe("Loader added to cart.");
    act(() => toastSuccess.mock.calls[0]![1].action.onClick());
    expect(renderHook(() => useCartOpen()).result.current).toBe(true);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([
      loader,
    ]);

    act(() => setCartOpen(false));
    fireEvent.click(pressed);
    expect(
      screen
        .getByRole("button", { name: "Add Loader to cart" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([]);
    expect(renderHook(() => useCartOpen()).result.current).toBe(false);
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("restores a stored cart and drops entries it cannot read", async () => {
    localStorage.setItem(
      "aui-elements-cart",
      JSON.stringify([loader, { slug: "broken" }, "nope"]),
    );
    const { CartToggle } = await loadCart();
    render(<CartToggle item={loader} />);

    expect(
      screen.getByRole("button", { name: "Remove Loader from cart" }),
    ).toBeDefined();
  });
});

describe("cartRegistryNames", () => {
  it("lists a registry item once when several elements install it", async () => {
    const { cartRegistryNames } = await loadCart();
    expect(
      cartRegistryNames([
        {
          slug: "composer",
          title: "Composer",
          registryName: "elements-composer",
        },
        {
          slug: "composer-slash",
          title: "Slash",
          registryName: "elements-composer",
        },
        loader,
      ]),
    ).toEqual(["elements-composer", "elements-loading-state"]);
  });
});
