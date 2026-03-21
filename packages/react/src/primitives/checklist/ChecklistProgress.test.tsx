import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistPrimitiveProgress } from "./ChecklistProgress";

const renderProgress = (items: ChecklistItemData[]) =>
  renderToStaticMarkup(<ChecklistPrimitiveProgress items={items} />);

describe("ChecklistPrimitiveProgress", () => {
  it("counts complete and error items as done", () => {
    const items: ChecklistItemData[] = [
      { id: "1", text: "A", status: "complete" },
      { id: "2", text: "B", status: "error" },
      { id: "3", text: "C", status: "running" },
      { id: "4", text: "D", status: "pending" },
      { id: "5", text: "E", status: "complete" },
    ];
    const html = renderProgress(items);
    expect(html).toContain("3/5 complete");
    expect(html).toContain('data-done="3"');
    expect(html).toContain('data-total="5"');
  });

  it("flattens nested children into count", () => {
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
    const html = renderProgress(items);
    expect(html).toContain("2/4 complete");
  });

  it("renders 0/0 for empty items", () => {
    const html = renderProgress([]);
    expect(html).toContain("0/0 complete");
  });
});
