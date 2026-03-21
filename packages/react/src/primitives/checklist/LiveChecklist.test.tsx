import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChecklistItemData } from "@assistant-ui/core";
import { LiveChecklist } from "./LiveChecklist";

const renderChecklist = (props: LiveChecklist.Props) =>
  renderToStaticMarkup(<LiveChecklist {...props} />);

describe("LiveChecklist (standalone mode)", () => {
  it("renders items in standalone mode", () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "Search", status: "complete" },
      { id: "2", text: "Analyze", status: "running" },
    ];
    const html = renderChecklist({ items });
    expect(html).toContain("Search");
    expect(html).toContain("Analyze");
    expect(html).toContain('data-status="complete"');
    expect(html).toContain('data-status="running"');
  });

  it("renders nothing for empty items array", () => {
    const html = renderChecklist({ items: [] });
    expect(html).toBe("");
  });

  it("renders progress when showProgress is true", () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "A", status: "complete" },
      { id: "2", text: "B", status: "pending" },
    ];
    const html = renderChecklist({ items, showProgress: true });
    expect(html).toContain("1/2 complete");
  });

  it("renders title when provided", () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "Task", status: "running" },
    ];
    const html = renderChecklist({ items, title: "Progress" });
    expect(html).toContain("Progress");
  });
});
