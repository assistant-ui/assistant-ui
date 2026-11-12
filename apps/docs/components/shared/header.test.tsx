// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { Header } from "./header";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/docs",
}));

afterEach(cleanup);

const menuPanel = () =>
  screen.getByRole("link", { name: "Elements" }).closest(".transition-opacity");

describe("marketing header", () => {
  beforeEach(() => {
    render(
      <AssistantPanelProvider>
        <Header />
      </AssistantPanelProvider>,
    );
  });

  it("reaches the featured links from the small screen menu", () => {
    expect(menuPanel()?.classList.contains("opacity-100")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(menuPanel()?.classList.contains("opacity-100")).toBe(true);

    expect(screen.getByRole("link", { name: "Elements" })).toHaveProperty(
      "pathname",
      "/elements",
    );
    expect(screen.getByRole("link", { name: "Design" })).toHaveProperty(
      "pathname",
      "/design",
    );
    expect(screen.getByRole("link", { name: "Examples" })).toHaveProperty(
      "pathname",
      "/examples",
    );
  });

  it("puts Search before Ask AI in every layout", () => {
    const actions = screen
      .getAllByRole("button", { name: /^(search|ask ai)/i })
      .map((button) =>
        (button.getAttribute("aria-label") ?? button.textContent ?? "")
          .toLowerCase()
          .startsWith("ask")
          ? "ask"
          : "search",
      );

    expect(actions.length).toBeGreaterThan(1);
    actions.forEach((action, index) => {
      if (action === "ask") expect(actions[index - 1]).toBe("search");
    });
    expect(actions.at(-1)).toBe("ask");
  });

  it("marks site navigation with the menu icon", () => {
    expect(
      screen
        .getByRole("button", { name: /menu/i })
        .querySelector("svg.lucide-menu"),
    ).not.toBeNull();
  });
});
