import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ToolError } from "./tool-error";

afterEach(cleanup);

describe("ToolError", () => {
  it("lets an unbroken tool name shrink and wrap inside the card", () => {
    const name = "mcp__playwright__browser_take_screenshot".repeat(3);
    render(
      <ToolError
        name={name}
        target="browser"
        message="The tool failed"
        attempt={1}
        maxAttempts={3}
        retrying={false}
      />,
    );

    const label = screen.getByText(name);
    expect(label.classList.contains("min-w-0")).toBe(true);
    expect(label.classList.contains("wrap-anywhere")).toBe(true);
    expect(label.classList.contains("shrink-0")).toBe(false);
  });
});
