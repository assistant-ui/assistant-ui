import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { LiveChecklist } from "./LiveChecklist";
import type { ChecklistItemData } from "./types";

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
});

describe("LiveChecklist", () => {
  it("renders items in standalone mode when items prop is passed", async () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "Step one", status: "complete" },
      { id: "2", text: "Step two", status: "running" },
      { id: "3", text: "Step three", status: "pending" },
    ];
    const frame = await renderFrame(<LiveChecklist items={items} />);
    expect(frame).toContain("Step one");
    expect(frame).toContain("Step two");
    expect(frame).toContain("Step three");
    expect(frame).toContain("■");
    expect(frame).toContain("□");
  });

  it("renders title when provided", async () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "Task", status: "pending" },
    ];
    const frame = await renderFrame(
      <LiveChecklist items={items} title="My Plan" />,
    );
    expect(frame).toContain("My Plan");
  });

  it("renders progress when showProgress is true", async () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "Done", status: "complete" },
      { id: "2", text: "Not done", status: "pending" },
    ];
    const frame = await renderFrame(
      <LiveChecklist items={items} showProgress />,
    );
    expect(frame).toContain("1/2 complete");
  });

  it("renders nothing for empty items array", async () => {
    const frame = await renderFrame(<LiveChecklist items={[]} />);
    expect(frame).toBe("");
  });
});
