// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepActivity } from "./step-activity";
import type { Checkout } from "../../../lib/checkout/protocol";

afterEach(cleanup);

const line = (id: string, text: string): Checkout.LogEntry => ({
  id,
  role: "agent",
  phase: "installing",
  at: Number(id.slice(1)),
  text,
  stepId: "s1",
});

const lines = [line("l1", "Reading app/api"), line("l2", "Writing route.ts")];

const toggle = () => screen.getByRole("button", { name: /lines? from Codex/ });
const expanded = () => toggle().getAttribute("aria-expanded");

describe("StepActivity", () => {
  it("opens while the step runs, reads its lines out live, and folds once the step is done", () => {
    const { rerender } = render(
      <StepActivity entries={lines} live agentName="Codex" />,
    );
    expect(toggle().textContent).toBe("2 lines from Codex");
    expect(expanded()).toBe("true");
    const log = screen.getByRole("log", { name: "What Codex did" });
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(
      Array.from(log.querySelectorAll("li")).map((item) => item.textContent),
    ).toEqual(["Reading app/api", "Writing route.ts"]);

    rerender(<StepActivity entries={lines} live={false} agentName="Codex" />);
    expect(expanded()).toBe("false");
    expect(screen.queryByRole("log")).toBeNull();
  });

  it("keeps the user's choice over the step's state", () => {
    const { rerender } = render(
      <StepActivity entries={[lines[0]!]} live agentName="Codex" />,
    );
    fireEvent.click(toggle());
    expect(expanded()).toBe("false");
    rerender(<StepActivity entries={lines} live agentName="Codex" />);
    expect(expanded()).toBe("false");
    expect(toggle().textContent).toBe("2 lines from Codex");

    rerender(<StepActivity entries={lines} live={false} agentName="Codex" />);
    fireEvent.click(toggle());
    expect(expanded()).toBe("true");
    expect(screen.getByRole("log").getAttribute("aria-live")).toBe("off");
    rerender(<StepActivity entries={lines} live={false} agentName="Codex" />);
    expect(expanded()).toBe("true");
  });

  it("follows the newest line while open", () => {
    const { rerender } = render(
      <StepActivity entries={[lines[0]!]} live agentName="Codex" />,
    );
    const log = screen.getByRole("log");
    const scrolled = vi.fn();
    Object.defineProperty(log, "scrollHeight", {
      value: 480,
      configurable: true,
    });
    Object.defineProperty(log, "scrollTop", {
      get: () => 0,
      set: scrolled,
      configurable: true,
    });
    rerender(<StepActivity entries={lines} live agentName="Codex" />);
    expect(scrolled).toHaveBeenLastCalledWith(480);
  });
});
