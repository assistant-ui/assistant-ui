// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

const measure = (log: HTMLElement) => {
  let top = 0;
  Object.defineProperty(log, "scrollHeight", {
    value: 400,
    configurable: true,
  });
  Object.defineProperty(log, "clientHeight", {
    value: 160,
    configurable: true,
  });
  Object.defineProperty(log, "scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
    configurable: true,
  });
};

describe("StepActivity", () => {
  it("opens while the step runs, reads its lines out live, and folds once the step is done", () => {
    const { rerender } = render(
      <StepActivity
        entries={lines}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "2 lines from Codex for Add the route",
      }),
    ).toBeTruthy();
    expect(expanded()).toBe("true");
    const log = screen.getByRole("log", { name: "What Codex did" });
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(
      Array.from(log.querySelectorAll("li")).map((item) => item.textContent),
    ).toEqual(["Reading app/api", "Writing route.ts"]);

    rerender(
      <StepActivity
        entries={lines}
        live={false}
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(expanded()).toBe("false");
    expect(screen.queryByRole("log")).toBeNull();
  });

  it("mounts an empty, hidden live log before the first line, and keeps that element once lines arrive", () => {
    const { rerender } = render(
      <StepActivity
        entries={[]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    const log = screen.getByRole("log", { name: "What Codex did" });
    expect(log.textContent).toBe("");
    expect(log.className).toBe("sr-only");
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <StepActivity
        entries={[lines[0]!]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(screen.getByRole("log", { name: "What Codex did" })).toBe(log);
    expect(log.className).not.toContain("sr-only");
    expect(log.textContent).toBe("Reading app/api");
    expect(
      screen
        .getByRole("button", { name: "1 line from Codex for Add the route" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("keeps the user's choice over the step's state", () => {
    const { rerender } = render(
      <StepActivity
        entries={[lines[0]!]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    fireEvent.click(toggle());
    expect(expanded()).toBe("false");
    rerender(
      <StepActivity
        entries={lines}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(expanded()).toBe("false");
    expect(
      screen.getByRole("button", {
        name: "2 lines from Codex for Add the route",
      }),
    ).toBeTruthy();

    rerender(
      <StepActivity
        entries={lines}
        live={false}
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    fireEvent.click(toggle());
    expect(expanded()).toBe("true");
    expect(screen.getByRole("log").getAttribute("aria-live")).toBe("off");
    rerender(
      <StepActivity
        entries={lines}
        live={false}
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(expanded()).toBe("true");
  });

  it("follows the newest line while open", () => {
    const { rerender } = render(
      <StepActivity
        entries={[lines[0]!]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    const log = screen.getByRole("log");
    measure(log);
    rerender(
      <StepActivity
        entries={lines}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(log.scrollTop).toBe(400);
  });

  it("keeps the place of a reader who scrolled up", () => {
    const { rerender } = render(
      <StepActivity
        entries={[lines[0]!]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    const log = screen.getByRole("log");
    measure(log);
    log.scrollTop = 0;
    fireEvent.scroll(log);
    rerender(
      <StepActivity
        entries={lines}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(log.scrollTop).toBe(0);
  });

  it("follows again once the reader is back at the bottom", () => {
    const { rerender } = render(
      <StepActivity
        entries={[lines[0]!]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    const log = screen.getByRole("log");
    measure(log);
    log.scrollTop = 0;
    fireEvent.scroll(log);
    log.scrollTop = 235;
    fireEvent.scroll(log);
    rerender(
      <StepActivity
        entries={lines}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(log.scrollTop).toBe(400);
  });

  it("follows again in a reopened panel, which is a new element", () => {
    const { rerender } = render(
      <StepActivity
        entries={[lines[0]!]}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    const log = screen.getByRole("log");
    measure(log);
    log.scrollTop = 0;
    fireEvent.scroll(log);
    fireEvent.click(toggle());
    expect(screen.queryByRole("log")).toBeNull();
    fireEvent.click(toggle());
    const reopened = screen.getByRole("log");
    expect(reopened).not.toBe(log);
    measure(reopened);
    rerender(
      <StepActivity
        entries={lines}
        live
        agentName="Codex"
        stepTitle="Add the route"
      />,
    );
    expect(reopened.scrollTop).toBe(400);
  });
});
