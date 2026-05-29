import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChecklistPrimitiveItem } from "./ChecklistItem";

const renderToHtml = (props: ChecklistPrimitiveItem.Props) =>
  renderToStaticMarkup(<ChecklistPrimitiveItem {...props} />);

describe("ChecklistPrimitiveItem", () => {
  it("renders data-status for each status", () => {
    const statuses = ["pending", "running", "complete", "error"] as const;
    for (const status of statuses) {
      const html = renderToHtml({ item: { id: "1", text: "Task", status } });
      expect(html).toContain(`data-status="${status}"`);
      expect(html).toContain("Task");
    }
  });

  it("renders detail when present", () => {
    const html = renderToHtml({
      item: { id: "1", text: "Task", status: "running", detail: "query: foo" },
    });
    expect(html).toContain("query: foo");
    expect(html).toContain("data-detail");
  });

  it("omits detail span when no detail", () => {
    const html = renderToHtml({
      item: { id: "1", text: "Task", status: "running" },
    });
    expect(html).not.toContain("data-detail");
  });

  it("renders custom children in place of the default row", () => {
    const html = renderToHtml({
      item: { id: "1", text: "Task", status: "complete" },
      children: <span className="custom">custom row</span>,
    });
    expect(html).toContain("custom");
    expect(html).toContain("custom row");
    expect(html).not.toContain("Task");
  });
});
