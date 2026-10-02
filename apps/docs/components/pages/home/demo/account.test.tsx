// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionState } from "@/lib/session";

const mocks = vi.hoisted(() => ({
  session: { status: "loading" } as SessionState,
  pathname: "/",
  trackDemoSignInClick: vi.fn(),
  resetAnalyticsUser: vi.fn(),
}));

vi.mock("@/lib/analytics-identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics-identity")>()),
  trackDemoSignInClick: mocks.trackDemoSignInClick,
  resetAnalyticsUser: mocks.resetAnalyticsUser,
}));

vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  useSession: () => mocks.session,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

import { SidebarAccount } from "./account";

afterEach(() => {
  cleanup();
});

describe("SidebarAccount", () => {
  it("offers nothing when the deployment carries no accounts config", () => {
    mocks.session = { status: "disabled" };
    const { container } = render(<SidebarAccount />);

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("holds the row height while the session resolves", () => {
    mocks.session = { status: "loading" };
    render(<SidebarAccount />);

    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Account" })).toBeNull();
  });

  it("returns an anonymous visitor to the page they signed in from", () => {
    mocks.session = { status: "anonymous" };
    mocks.pathname = "/docs/getting-started";
    render(<SidebarAccount />);

    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/api/auth/login?redirect=%2Fdocs%2Fgetting-started");
  });

  it("names the signed-in visitor and falls back to initials", () => {
    mocks.session = {
      status: "signed-in",
      cloudHistory: false,
      user: {
        id: "user_1",
        name: "Harry Yep",
        email: "harry@assistant-ui.com",
        image: null,
      },
    };
    render(<SidebarAccount />);

    const trigger = screen.getByRole("button", { name: "Account" });
    expect(trigger.textContent).toContain("Harry Yep");
    expect(trigger.textContent).toContain("HY");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("tracks the sign-in it offers", () => {
    mocks.session = { status: "anonymous" };
    render(<SidebarAccount />);

    const link = screen.getByRole("link", { name: "Sign in" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(mocks.trackDemoSignInClick).toHaveBeenCalledExactlyOnceWith(
      "sidebar",
    );
  });

  it("forgets the analytics identity before signing out", async () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {});
    mocks.session = {
      status: "signed-in",
      cloudHistory: false,
      user: {
        id: "user_1",
        name: "Harry Yep",
        email: "harry@assistant-ui.com",
        image: null,
      },
    };
    render(<SidebarAccount />);

    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    expect(mocks.resetAnalyticsUser).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();
    expect(mocks.resetAnalyticsUser.mock.invocationCallOrder[0]).toBeLessThan(
      submit.mock.invocationCallOrder[0]!,
    );
  });
});
