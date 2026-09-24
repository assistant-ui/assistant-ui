// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SetupNavigationProvider,
  useSetupNavigation,
} from "./setup-navigation";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  back: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => navigation.pathname,
  useRouter: () => navigation,
}));
vi.mock("@/lib/checkout/session-store", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../lib/checkout/session-store")
  >()),
  useCheckoutSession: () => ({ id: "test-session" }),
}));

function Controls() {
  const { enterSetup, leaveSetup, resumeHint, dismissResumeHint } =
    useSetupNavigation();
  return (
    <>
      <button onClick={enterSetup}>Open setup</button>
      <button onClick={leaveSetup}>Back</button>
      <button onClick={dismissResumeHint}>Dismiss</button>
      {resumeHint ? <p>Resume setup anytime</p> : null}
    </>
  );
}
const app = () => (
  <SetupNavigationProvider>
    <Controls />
  </SetupNavigationProvider>
);
const visit = (href: string) => {
  window.history.replaceState({}, "", href);
  navigation.pathname = window.location.pathname;
};
beforeEach(() => {
  sessionStorage.clear();
  visit("/");
});
afterEach(cleanup);

describe("setup navigation", () => {
  it("returns through history to the page that opened setup", () => {
    visit("/docs?tab=react#installation");
    const { rerender } = render(app());
    fireEvent.click(screen.getByText("Open setup"));
    expect(sessionStorage.getItem("aui-setup-return-to")).toBe(
      "/docs?tab=react#installation",
    );
    visit("/shop/setup");
    rerender(app());
    fireEvent.click(screen.getByText("Back"));
    expect(navigation.back).toHaveBeenCalledOnce();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("returns home from the cart and explains resuming only on the first exit", () => {
    visit("/shop/cart");
    const { rerender } = render(app());
    fireEvent.click(screen.getByText("Open setup"));
    visit("/shop/setup");
    rerender(app());
    fireEvent.click(screen.getByText("Back"));
    expect(navigation.replace).toHaveBeenCalledWith("/");
    expect(navigation.back).not.toHaveBeenCalled();
    visit("/");
    rerender(app());
    expect(screen.getByText("Resume setup anytime")).toBeDefined();
    fireEvent.click(screen.getByText("Dismiss"));
    expect(screen.queryByText("Resume setup anytime")).toBeNull();
    fireEvent.click(screen.getByText("Open setup"));
    visit("/shop/setup");
    rerender(app());
    visit("/");
    rerender(app());
    expect(screen.queryByText("Resume setup anytime")).toBeNull();
  });

  it("uses the saved return page after reload instead of leaving the site", () => {
    sessionStorage.setItem(
      "aui-setup-return-to",
      "/docs?tab=react#installation",
    );
    visit("/shop/setup");
    render(app());
    fireEvent.click(screen.getByText("Back"));
    expect(navigation.replace).toHaveBeenCalledWith(
      "/docs?tab=react#installation",
    );
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it.each([null, "//example.com", "/\\example.com", "/shop/setup"])(
    "returns home for an absent or invalid origin (%s)",
    (origin) => {
      if (origin !== null)
        sessionStorage.setItem("aui-setup-return-to", origin);
      visit("/shop/setup");
      render(app());
      fireEvent.click(screen.getByText("Back"));
      expect(navigation.replace).toHaveBeenCalledWith("/");
    },
  );
});
