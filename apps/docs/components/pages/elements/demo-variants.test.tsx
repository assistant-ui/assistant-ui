// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DemoVariants } from "./demo-variants";

afterEach(cleanup);

it("switches the active typing demo using only serializable page props", () => {
  render(<DemoVariants slug="typing-indicator" replay={false} />);

  const bubble = screen.getByRole("button", { name: "Bubble" });
  const bare = screen.getByRole("button", { name: "Bare" });
  expect(bubble.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(bare);
  expect(bare.getAttribute("aria-pressed")).toBe("true");
  expect(bubble.getAttribute("aria-pressed")).toBe("false");
  expect(
    screen.getByRole("status", { name: "Assistant is typing" }).dataset.variant,
  ).toBe("bare");
});
