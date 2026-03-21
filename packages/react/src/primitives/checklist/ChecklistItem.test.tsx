import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ChecklistItemData } from "@assistant-ui/core";
import { ChecklistPrimitiveItem } from "./ChecklistItem";

const renderItem = (props: ChecklistPrimitiveItem.Props) =>
  renderToStaticMarkup(<ChecklistPrimitiveItem {...props} />);

describe("ChecklistPrimitiveItem", () => {
  it("renders data-status for each status", () => {
    const statuses = ["pending", "running", "complete", "error"] as const;
    for (const status of statuses) {
      const html = renderItem({
        item: { id: "1", text: "Task", status },
      });
      expect(html).toContain(`data-status="${status}"`);
      expect(html).toContain("Task");
    }
  });

  it("renders detail when present", () => {
    const html = renderItem({
      item: { id: "1", text: "Task", status: "running", detail: "query: foo" },
    });
    expect(html).toContain("query: foo");
    expect(html).toContain("data-detail");
  });

  it("omits detail span when no detail", () => {
    const html = renderItem({
      item: { id: "1", text: "Task", status: "running" },
    });
    expect(html).not.toContain("data-detail");
  });

  it("renders nested children", () => {
    const item: ChecklistItemData = {
      id: "1",
      text: "Parent",
      status: "running",
      children: [
        { id: "1a", text: "Child A", status: "complete" },
        { id: "1b", text: "Child B", status: "pending" },
      ],
    };
    const html = renderItem({ item });
    expect(html).toContain("Parent");
    expect(html).toContain("Child A");
    expect(html).toContain("Child B");
  });

  it("respects maxDepth", () => {
    const item: ChecklistItemData = {
      id: "1",
      text: "Level 0",
      status: "running",
      children: [
        {
          id: "2",
          text: "Level 1",
          status: "running",
          children: [{ id: "3", text: "Level 2", status: "pending" }],
        },
      ],
    };
    const html = renderItem({ item, maxDepth: 1 });
    expect(html).toContain("Level 0");
    expect(html).toContain("Level 1");
    expect(html).not.toContain("Level 2");
  });

  it("uses renderItem when provided", () => {
    const html = renderItem({
      item: { id: "1", text: "Task", status: "complete" },
      renderItem: ({ item }) => <span className="custom">{item.text}</span>,
    });
    expect(html).toContain("custom");
    expect(html).toContain("Task");
  });
});
