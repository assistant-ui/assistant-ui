import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ChecklistProgress } from "./ChecklistProgress";
import type { ChecklistItemData } from "@assistant-ui/core";

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
});

describe("ChecklistProgress", () => {
  it("counts complete and error items as done", async () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "A", status: "complete" },
      { id: "2", text: "B", status: "error" },
      { id: "3", text: "C", status: "running" },
      { id: "4", text: "D", status: "pending" },
      { id: "5", text: "E", status: "complete" },
    ];
    const frame = await renderFrame(<ChecklistProgress items={items} />);
    expect(frame).toContain("3/5 complete");
  });

  it("flattens nested children into count", async () => {
    const items: ChecklistItemData[] = [
      {
        id: "1",
        text: "Parent",
        status: "running",
        children: [
          { id: "1a", text: "Child A", status: "complete" },
          { id: "1b", text: "Child B", status: "pending" },
        ],
      },
      { id: "2", text: "Other", status: "complete" },
    ];
    const frame = await renderFrame(<ChecklistProgress items={items} />);
    expect(frame).toContain("2/4 complete");
  });

  it("renders 0/0 complete for empty items", async () => {
    const frame = await renderFrame(<ChecklistProgress items={[]} />);
    expect(frame).toContain("0/0 complete");
  });
});
