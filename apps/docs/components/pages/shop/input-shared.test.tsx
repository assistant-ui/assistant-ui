// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InputHelp } from "./input-shared";

afterEach(cleanup);

describe("InputHelp", () => {
  it("renders an HTTPS guide link with its destination host", () => {
    const { container } = render(
      <InputHelp
        help={{
          summary: "Pick the setup that fits your project.",
          href: "https://docs.example.com/guides/setup",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Need help choosing?" }),
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(
      "https://docs.example.com/guides/setup",
    );
    expect(link?.textContent).toBe("Read the full guide");
    expect(container.textContent).toContain("(docs.example.com)");
  });

  it.each([
    "javascript:alert(1)",
    "http://x.test",
    "/guides/setup",
    "https://%",
  ])("does not render an unsafe guide link for %s", (href) => {
    const { container } = render(
      <InputHelp help={{ summary: "Choose carefully.", href }} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Need help choosing?" }),
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("Choose carefully.");
  });
});
