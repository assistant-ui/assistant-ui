// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { PlanCard, PlanMarkdown } from "./plan-card";

describe("PlanMarkdown", () => {
  it("renders image alt text without an image element", () => {
    const { container } = render(
      <PlanMarkdown markdown="![tracker](https://attacker.example/t.png)" />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("tracker")).toBeDefined();
  });
});

describe("PlanMarkdown links", () => {
  it("names the host of an https link and drops any other target", () => {
    const { container } = render(
      <PlanMarkdown markdown="[docs](https://evil.example/x) and [local](http://x.test) and [script](javascript:alert(1))" />,
    );

    const links = [...container.querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://evil.example/x",
    ]);
    expect(container.textContent).toContain("docs (evil.example)");
    expect(container.textContent).toContain("local");
    expect(container.textContent).toContain("script");
  });
});

describe("PlanCard", () => {
  it("keeps the toggle mounted and focused while an approved plan opens and closes", () => {
    render(
      <PlanCard
        closed={false}
        checkout={{} as CheckoutContextValue}
        plans={[
          {
            revision: 1,
            markdown: "Install the packages",
            status: "approved",
            submittedAt: 1,
          },
        ]}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Show the plan" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Install the packages")).toBeNull();

    toggle.focus();
    fireEvent.click(toggle);

    expect(screen.getByText("Install the packages")).toBeDefined();
    expect(toggle.isConnected).toBe(true);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toContain("Hide the plan");

    fireEvent.click(toggle);
    expect(screen.queryByText("Install the packages")).toBeNull();
  });
});
