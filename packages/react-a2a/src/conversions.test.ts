import { describe, it, expect } from "vitest";
import {
  a2aPartToContent,
  a2aPartsToContent,
  a2aMessageToContent,
  taskStateToMessageStatus,
  contentPartsToA2AParts,
  isTerminalTaskState,
  isInterruptedTaskState,
} from "./conversions";
import type { A2APart, A2AMessage, A2ATaskState } from "./types";

describe("a2aPartToContent", () => {
  it("converts text part", () => {
    const part: A2APart = { text: "Hello world" };
    expect(a2aPartToContent(part)).toEqual({
      type: "text",
      text: "Hello world",
    });
  });

  it("converts image URL part", () => {
    const part: A2APart = {
      url: "https://example.com/img.png",
      mediaType: "image/png",
    };
    expect(a2aPartToContent(part)).toEqual({
      type: "image",
      image: "https://example.com/img.png",
    });
  });

  it("converts non-image URL as text link", () => {
    const part: A2APart = {
      url: "https://example.com/doc.pdf",
      mediaType: "application/pdf",
      filename: "doc.pdf",
    };
    expect(a2aPartToContent(part)).toEqual({
      type: "text",
      text: "[doc.pdf](https://example.com/doc.pdf)",
    });
  });

  it("converts URL without filename as plain text", () => {
    const part: A2APart = {
      url: "https://example.com/doc.pdf",
      mediaType: "application/pdf",
    };
    expect(a2aPartToContent(part)).toEqual({
      type: "text",
      text: "https://example.com/doc.pdf",
    });
  });

  it("converts raw image bytes to data URI", () => {
    const part: A2APart = {
      raw: "iVBORw0KGgo=",
      mediaType: "image/png",
    };
    expect(a2aPartToContent(part)).toEqual({
      type: "image",
      image: "data:image/png;base64,iVBORw0KGgo=",
    });
  });

  it("converts raw non-image bytes as file reference", () => {
    const part: A2APart = {
      raw: "AAAA",
      mediaType: "application/pdf",
      filename: "report.pdf",
    };
    expect(a2aPartToContent(part)).toEqual({
      type: "text",
      text: "[File: report.pdf]",
    });
  });

  it("converts raw bytes without filename", () => {
    const part: A2APart = {
      raw: "AAAA",
      mediaType: "application/octet-stream",
    };
    expect(a2aPartToContent(part)).toEqual({
      type: "text",
      text: "[File: download]",
    });
  });

  it("converts data part as JSON", () => {
    const part: A2APart = { data: { key: "value", count: 42 } };
    const result = a2aPartToContent(part);
    expect(result.type).toBe("text");
    expect(JSON.parse((result as { text: string }).text)).toEqual({
      key: "value",
      count: 42,
    });
  });

  it("returns empty text for empty part", () => {
    const part: A2APart = {};
    expect(a2aPartToContent(part)).toEqual({ type: "text", text: "" });
  });
});

describe("a2aPartsToContent", () => {
  it("converts multiple parts", () => {
    const parts: A2APart[] = [
      { text: "Hello" },
      { url: "https://img.com/a.jpg", mediaType: "image/jpeg" },
    ];
    const result = a2aPartsToContent(parts);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "text", text: "Hello" });
    expect(result[1]).toEqual({
      type: "image",
      image: "https://img.com/a.jpg",
    });
  });

  it("handles empty parts array", () => {
    expect(a2aPartsToContent([])).toEqual([]);
  });
});

describe("a2aMessageToContent", () => {
  it("converts message parts to content", () => {
    const msg: A2AMessage = {
      messageId: "m1",
      role: "agent",
      parts: [{ text: "Hello" }, { text: " world" }],
    };
    const result = a2aMessageToContent(msg);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "text", text: "Hello" });
    expect(result[1]).toEqual({ type: "text", text: " world" });
  });
});

describe("taskStateToMessageStatus", () => {
  it("maps submitted to running", () => {
    expect(taskStateToMessageStatus("submitted")).toEqual({
      type: "running",
    });
  });

  it("maps working to running", () => {
    expect(taskStateToMessageStatus("working")).toEqual({
      type: "running",
    });
  });

  it("maps completed to complete", () => {
    expect(taskStateToMessageStatus("completed")).toEqual({
      type: "complete",
      reason: "stop",
    });
  });

  it("maps failed to error", () => {
    expect(taskStateToMessageStatus("failed")).toEqual({
      type: "incomplete",
      reason: "error",
    });
  });

  it("maps canceled to cancelled", () => {
    expect(taskStateToMessageStatus("canceled")).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("maps rejected to error", () => {
    expect(taskStateToMessageStatus("rejected")).toEqual({
      type: "incomplete",
      reason: "error",
    });
  });

  it("maps input_required to requires-action", () => {
    expect(taskStateToMessageStatus("input_required")).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("maps auth_required to requires-action", () => {
    expect(taskStateToMessageStatus("auth_required")).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("maps unspecified to running", () => {
    expect(taskStateToMessageStatus("unspecified")).toEqual({
      type: "running",
    });
  });
});

describe("isTerminalTaskState", () => {
  it.each([
    "completed",
    "failed",
    "canceled",
    "rejected",
  ] as A2ATaskState[])("returns true for %s", (state) => {
    expect(isTerminalTaskState(state)).toBe(true);
  });

  it.each([
    "submitted",
    "working",
    "input_required",
    "auth_required",
    "unspecified",
  ] as A2ATaskState[])("returns false for %s", (state) => {
    expect(isTerminalTaskState(state)).toBe(false);
  });
});

describe("isInterruptedTaskState", () => {
  it.each([
    "input_required",
    "auth_required",
  ] as A2ATaskState[])("returns true for %s", (state) => {
    expect(isInterruptedTaskState(state)).toBe(true);
  });

  it.each([
    "submitted",
    "working",
    "completed",
    "failed",
    "canceled",
    "rejected",
    "unspecified",
  ] as A2ATaskState[])("returns false for %s", (state) => {
    expect(isInterruptedTaskState(state)).toBe(false);
  });
});

describe("contentPartsToA2AParts", () => {
  it("converts text parts", () => {
    const result = contentPartsToA2AParts([{ type: "text", text: "hi" }]);
    expect(result).toEqual([{ text: "hi" }]);
  });

  it("converts image parts", () => {
    const result = contentPartsToA2AParts([
      { type: "image", image: "https://img.com/a.png" },
    ]);
    expect(result).toEqual([
      { url: "https://img.com/a.png", mediaType: "image/*" },
    ]);
  });

  it("skips image parts with no URL", () => {
    const result = contentPartsToA2AParts([{ type: "image" }]);
    expect(result).toEqual([]);
  });

  it("skips unknown part types", () => {
    const result = contentPartsToA2AParts([
      { type: "text", text: "hi" },
      { type: "audio" },
      { type: "video" },
    ]);
    expect(result).toEqual([{ text: "hi" }]);
  });

  it("handles empty input", () => {
    expect(contentPartsToA2AParts([])).toEqual([]);
  });
});
