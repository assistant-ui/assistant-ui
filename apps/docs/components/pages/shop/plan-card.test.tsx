// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanMarkdown } from "./plan-card";

describe("PlanMarkdown", () => {
  it("renders image alt text without an image element", () => {
    const { container } = render(
      <PlanMarkdown markdown="![tracker](https://attacker.example/t.png)" />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("tracker")).toBeDefined();
  });
});
