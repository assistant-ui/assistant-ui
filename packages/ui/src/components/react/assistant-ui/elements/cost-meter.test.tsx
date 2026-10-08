import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CostMeter } from "./cost-meter";

afterEach(cleanup);

describe("CostMeter", () => {
  it("prints each line's token counts in the unit that keeps them short", () => {
    render(
      <CostMeter
        runCost="$1,204.18"
        sessionCost="$12,881.02"
        lines={[
          {
            model: "Opus 5",
            inputTokens: 912_480_000,
            outputTokens: 48_120_000,
            cost: "$1,204.18",
            share: 0.9,
          },
          {
            model: "Haiku 4.5",
            inputTokens: 140_000,
            outputTokens: 900,
            cost: "$0.24",
            share: 0.1,
          },
        ]}
      />,
    );

    expect(screen.getByText("912.5M in · 48.1M out")).toBeTruthy();
    expect(screen.getByText("140k in · 900 out")).toBeTruthy();
  });
});
