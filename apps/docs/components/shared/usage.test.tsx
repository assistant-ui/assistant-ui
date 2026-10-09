// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { UsageToolUI } from "./usage";

afterEach(() => {
  cleanup();
});

const result = {
  conversationsUsedToday: 2,
  conversationsAllowedPerDay: 3,
  conversationsRemaining: 1,
  resetsAt: "2026-09-05T00:00:00.000Z",
  signedIn: false,
};

describe("UsageToolUI", () => {
  it("reports the day's count once the read lands", () => {
    const { container } = render(
      <UsageToolUI status={{ type: "complete" }} result={result} />,
    );

    // The leading ">" is the shared trace marker this line renders through.
    expect(container.textContent).toBe(">checked 2 of 3 conversations today");
  });

  it("says it is reading while the tool runs", () => {
    const { container } = render(
      <UsageToolUI status={{ type: "running" }} result={undefined} />,
    );

    expect(container.textContent).toBe(">checking today's usage");
  });

  // The tool throws rather than resolving when the budget cannot be read, so a
  // complete call without a result is not a state this should invent copy for.
  it("renders nothing when a completed call carries no result", () => {
    const { container } = render(
      <UsageToolUI status={{ type: "complete" }} result={undefined} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
