import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { ChecklistItem } from "./ChecklistItem";

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
});

describe("ChecklistItem", () => {
  it("renders pending status with empty square indicator", async () => {
    const frame = await renderFrame(
      <ChecklistItem
        item={{ id: "1", text: "Analyze codebase", status: "pending" }}
      />,
    );
    expect(frame).toContain("□");
    expect(frame).toContain("Analyze codebase");
  });

  it("renders complete status with filled square indicator", async () => {
    const frame = await renderFrame(
      <ChecklistItem
        item={{ id: "2", text: "Install deps", status: "complete" }}
      />,
    );
    expect(frame).toContain("■");
    expect(frame).toContain("Install deps");
  });

  it("renders error status with x indicator", async () => {
    const frame = await renderFrame(
      <ChecklistItem item={{ id: "3", text: "Deploy", status: "error" }} />,
    );
    expect(frame).toContain("x");
    expect(frame).toContain("Deploy");
  });

  it("renders running status with spinner and text", async () => {
    const frame = await renderFrame(
      <ChecklistItem item={{ id: "4", text: "Building", status: "running" }} />,
    );
    expect(frame).toContain("Building");
  });

  it("renders detail text in parentheses", async () => {
    const frame = await renderFrame(
      <ChecklistItem
        item={{ id: "5", text: "Run tests", status: "complete", detail: "3/5" }}
      />,
    );
    expect(frame).toContain("(3/5)");
  });

  it("renders nested children with indentation", async () => {
    const frame = await renderFrame(
      <ChecklistItem
        item={{
          id: "6",
          text: "Refactor",
          status: "running",
          children: [
            { id: "6a", text: "Extract middleware", status: "complete" },
          ],
        }}
      />,
    );
    expect(frame).toContain("Refactor");
    expect(frame).toContain("Extract middleware");
    expect(frame).toContain("■");
  });

  it("respects maxDepth and stops rendering beyond it", async () => {
    const frame = await renderFrame(
      <ChecklistItem
        maxDepth={1}
        item={{
          id: "7",
          text: "Top",
          status: "running",
          children: [
            {
              id: "7a",
              text: "Child",
              status: "pending",
              children: [{ id: "7b", text: "Grandchild", status: "pending" }],
            },
          ],
        }}
      />,
    );
    expect(frame).toContain("Top");
    expect(frame).toContain("Child");
    expect(frame).not.toContain("Grandchild");
  });

  it("renders nothing for empty children array", async () => {
    const frame = await renderFrame(
      <ChecklistItem
        item={{ id: "8", text: "Empty", status: "pending", children: [] }}
      />,
    );
    expect(frame).toContain("Empty");
  });
});
