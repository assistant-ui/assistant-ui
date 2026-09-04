// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionState } from "@/lib/session";

const mocks = vi.hoisted(() => ({
  session: { status: "loading" } as SessionState,
  pathname: "/",
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
      user: { name: "Harry Yep", email: "harry@assistant-ui.com", image: null },
    };
    render(<SidebarAccount />);

    const trigger = screen.getByRole("button", { name: "Account" });
    expect(trigger.textContent).toContain("Harry Yep");
    expect(trigger.textContent).toContain("HY");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});
