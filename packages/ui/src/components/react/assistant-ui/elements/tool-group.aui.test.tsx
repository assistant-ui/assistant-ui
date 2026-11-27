import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ToolGroupRoot, ToolGroupTrigger } from "./tool-group.aui";

afterEach(cleanup);

const triggerSlots = () =>
  [...screen.getByRole("button", { name: "2 tool calls" }).children].map(
    (child) => child.getAttribute("data-slot"),
  );

it("swaps the loader and chevron in one slot so the label holds its place", () => {
  const view = render(
    <ToolGroupRoot>
      <ToolGroupTrigger count={2} active />
    </ToolGroupRoot>,
  );
  expect(triggerSlots()).toEqual([
    "tool-group-trigger-label",
    "tool-group-trigger-loader",
  ]);

  view.rerender(
    <ToolGroupRoot>
      <ToolGroupTrigger count={2} />
    </ToolGroupRoot>,
  );
  expect(triggerSlots()).toEqual([
    "tool-group-trigger-label",
    "tool-group-trigger-chevron",
  ]);
});
