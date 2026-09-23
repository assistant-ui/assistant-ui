// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupBackdropButton } from "./setup-back-button";
import { SetupNavigationProvider } from "../../shared/setup-navigation";

const navigation = vi.hoisted(() => ({
  pathname: "/shop/setup",
  back: vi.fn(),
  replace: vi.fn(),
}));
const store = vi.hoisted(() => ({
  session: { id: "test-session" } as { id: string } | null,
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => navigation.pathname,
  useRouter: () => navigation,
}));
vi.mock("../../../lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../lib/checkout/session-store")
  >()),
  useCheckoutSession: () => store.session,
}));

const app = () =>
  render(
    <SetupNavigationProvider>
      <SetupBackdropButton />
      <div role="dialog">
        <button>Inside dialog</button>
      </div>
    </SetupNavigationProvider>,
  );
beforeEach(() => {
  sessionStorage.setItem("aui-setup-return-to", "/shop");
  store.session = { id: "test-session" };
});
afterEach(cleanup);

describe("SetupBackdropButton", () => {
  it("leaves setup without ending the session", () => {
    app();
    fireEvent.click(
      screen.getByRole("button", { name: "Back, setup keeps running" }),
    );
    expect(navigation.replace).toHaveBeenCalledWith("/shop");
  });

  it("leaves on Escape unless the key was pressed inside a dialog", () => {
    app();
    fireEvent.keyDown(screen.getByText("Inside dialog"), { key: "Escape" });
    expect(navigation.replace).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(navigation.replace).toHaveBeenCalledWith("/shop");
  });

  it("renders nothing without a session", () => {
    store.session = null;
    app();
    expect(screen.queryByRole("button", { name: /Back/ })).toBeNull();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
