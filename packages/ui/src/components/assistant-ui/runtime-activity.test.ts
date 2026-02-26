import { describe, expect, it } from "vitest";
import {
  deriveCollapsedActivity,
  extractSearchResults,
  formatSearchSourceLabel,
  getActivityFromPart,
  inferStepTypeFromTool,
  inferToolActivityStatusType,
  isMessageStatusStreaming,
  mapPartStatusToStepStatus,
  partStatusOrFallback,
} from "./chain-of-thought/runtime-activity";

describe("runtime-activity", () => {
  it("maps runtime statuses to step statuses", () => {
    expect(mapPartStatusToStepStatus("running")).toBe("active");
    expect(mapPartStatusToStepStatus("requires-action")).toBe("active");
    expect(mapPartStatusToStepStatus("incomplete")).toBe("error");
    expect(mapPartStatusToStepStatus("complete")).toBe("complete");
    expect(mapPartStatusToStepStatus(undefined)).toBe("complete");
  });

  it("infers step type and streaming status", () => {
    expect(inferStepTypeFromTool("search_web")).toBe("search");
    expect(inferStepTypeFromTool("image_generation")).toBe("image");
    expect(inferStepTypeFromTool("write_file")).toBe("write");
    expect(inferStepTypeFromTool("custom_tool")).toBe("tool");

    expect(isMessageStatusStreaming("running")).toBe(true);
    expect(isMessageStatusStreaming("requires-action")).toBe(true);
    expect(isMessageStatusStreaming("complete")).toBe(false);
  });

  it("falls back part status from chain/message state", () => {
    expect(partStatusOrFallback("running", "complete", "complete")).toBe(
      "running",
    );
    expect(partStatusOrFallback(undefined, "running", "complete")).toBe(
      "running",
    );
    expect(partStatusOrFallback(undefined, "complete", "requires-action")).toBe(
      "requires-action",
    );
    expect(partStatusOrFallback(undefined, "complete", "complete")).toBe(
      "complete",
    );
  });

  it("infers active tool-call status while message is still streaming", () => {
    const basePart = { type: "tool-call", toolName: "search_web" };

    expect(
      inferToolActivityStatusType(
        { ...basePart, result: undefined },
        "complete",
        "running",
      ),
    ).toBe("running");
    expect(
      inferToolActivityStatusType(
        { ...basePart, interrupt: true },
        "complete",
        "running",
      ),
    ).toBe("requires-action");
  });

  it("resolves default and custom activity labels", () => {
    const part = { type: "tool-call", toolName: "search_web" };
    expect(
      getActivityFromPart(part, "running", undefined, "running", "running"),
    ).toBe("Searching the web");
    expect(
      getActivityFromPart(part, "complete", undefined, "complete", "complete"),
    ).toBe("Searched the web");

    const custom = getActivityFromPart(
      part,
      "running",
      {
        search_web: () => "  custom activity  ",
      },
      "running",
      "running",
    );
    expect(custom).toBe("custom activity");
  });

  it("builds collapsed activity from active/last reasoning-tool part", () => {
    const active = deriveCollapsedActivity({
      parts: [
        { type: "reasoning", text: "first", status: { type: "complete" } },
        {
          type: "tool-call",
          toolName: "search_web",
          status: { type: "running" },
        },
        { type: "text", text: "tail" },
      ],
      chainStatusType: "running",
      messageStatusType: "running",
      toolActivityLabels: undefined,
    });
    expect(active).toBe("Searching the web");

    const completed = deriveCollapsedActivity({
      parts: [
        { type: "reasoning", text: "first", status: { type: "complete" } },
        {
          type: "tool-call",
          toolName: "search_web",
          status: { type: "complete" },
          result: { hits: 2 },
        },
        { type: "text", text: "tail" },
      ],
      chainStatusType: "complete",
      messageStatusType: "complete",
      toolActivityLabels: undefined,
    });
    expect(completed).toBe("Searched the web");
  });

  it("parses search result metadata and source labels", () => {
    expect(extractSearchResults("fetch_docs", { hits: 2 })).toBeNull();
    expect(extractSearchResults("search_web", { unrelated: true })).toBeNull();

    const parsed = extractSearchResults("search_web", {
      hits: 2,
      sources: ["https://example.com/path"],
    });
    expect(parsed).toEqual({
      summary: "Found 2 results.",
      sources: ["https://example.com/path"],
    });
    expect(formatSearchSourceLabel("https://example.com/path")).toBe(
      "example.com/path",
    );
    expect(formatSearchSourceLabel("plain-source")).toBe("plain-source");
  });
});
