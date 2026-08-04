// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HighlightedCode } from "codehike/code";
import type * as CodeSlideshowClient from "@/components/docs/code-slideshow/client";
import {
  TapTutorialPlaygroundClient,
  type TapTutorialClientStep,
} from "./tutorial-playground.client";

vi.mock("@/components/docs/code-slideshow/client", async (importOriginal) => ({
  ...(await importOriginal<typeof CodeSlideshowClient>()),
  CodePane: ({ index }: { index: number }) => (
    <div data-testid="code-pane" data-index={index} />
  ),
}));

const step = (title: string): TapTutorialClientStep => ({
  title,
  prose: `${title} prose`,
  filename: "counter.jsx",
  code: {} as HighlightedCode,
});

const steps = [step("First"), step("Second"), step("Third")];

const renderPlayground = () =>
  render(<TapTutorialPlaygroundClient steps={steps} />);

afterEach(cleanup);

describe("TapTutorialPlaygroundClient", () => {
  it("drives the counter through the tap resource", () => {
    renderPlayground();

    const output = document.querySelector("output")!;
    expect(output.textContent).toBe("0");

    fireEvent.click(screen.getByLabelText("Increment"));
    fireEvent.click(screen.getByLabelText("Increment"));
    expect(output.textContent).toBe("2");

    fireEvent.click(screen.getByLabelText("Decrement"));
    expect(output.textContent).toBe("1");
    expect(screen.getByText(/"count": 1/)).toBeDefined();
  });

  it("navigates steps with Back and Next", () => {
    renderPlayground();

    expect(screen.getByText("Step 1 of 3")).toBeDefined();
    expect(screen.getByRole("button", { name: /Back/ })).toHaveProperty(
      "disabled",
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Step 2 of 3")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
    expect(screen.getByTestId("code-pane").getAttribute("data-index")).toBe(
      "1",
    );

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Step 1 of 3")).toBeDefined();
  });

  it("wraps back to the first step from the last", () => {
    renderPlayground();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Step 3 of 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Start over/ }));
    expect(screen.getByText("Step 1 of 3")).toBeDefined();
  });

  it("keeps counter state across step navigation", () => {
    renderPlayground();

    fireEvent.click(screen.getByLabelText("Increment"));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Start over/ }));

    expect(document.querySelector("output")!.textContent).toBe("1");
  });
});
