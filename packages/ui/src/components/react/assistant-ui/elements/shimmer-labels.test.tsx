import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Reasoning } from "./reasoning.aui";
import { ToolFallback } from "./tool-fallback.aui";
import { ToolGroup } from "./tool-group.aui";

const cases: Record<string, { element: ReactElement; text: string }> = {
  "reasoning trigger": {
    element: (
      <Reasoning.Root>
        <Reasoning.Trigger active duration={3} />
      </Reasoning.Root>
    ),
    text: "Reasoning (3s)",
  },
  "tool-fallback trigger": {
    element: (
      <ToolFallback.Root>
        <ToolFallback.Trigger toolName="Search" status={{ type: "running" }} />
      </ToolFallback.Root>
    ),
    text: "Search",
  },
  "tool-group trigger": {
    element: (
      <ToolGroup.Root>
        <ToolGroup.Trigger count={3} active />
      </ToolGroup.Root>
    ),
    text: "3 tool calls",
  },
};

afterEach(cleanup);

describe("shimmer labels", () => {
  it.each(Object.entries(cases))(
    "%s keeps shimmer text outside aria-hidden subtrees",
    (_name, { element }) => {
      const { container } = render(element);
      const shimmerLabels = container.querySelectorAll(".shimmer");

      expect(shimmerLabels.length).toBeGreaterThan(0);
      for (const shimmerLabel of shimmerLabels) {
        expect(shimmerLabel.closest('[aria-hidden="true"]')).toBeNull();
      }
    },
  );

  it.each(Object.entries(cases))(
    "%s renders its active shimmer label's text exactly once",
    (_name, { element, text }) => {
      const { getAllByText } = render(element);

      expect(getAllByText(text)).toHaveLength(1);
    },
  );
});
