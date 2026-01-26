import { describe, it, expect } from "vitest";
import { textBlock, imageBlock } from "./types";

describe("textBlock", () => {
  it("should create a text block with required fields", () => {
    const block = textBlock("Hello, world!");

    expect(block).toEqual({
      type: "text",
      text: "Hello, world!",
    });
  });

  it("should create a text block with annotations", () => {
    const block = textBlock("Hello", {
      audience: ["user"],
      priority: 1,
    });

    expect(block).toEqual({
      type: "text",
      text: "Hello",
      annotations: {
        audience: ["user"],
        priority: 1,
      },
    });
  });

  it("should not include annotations if undefined", () => {
    const block = textBlock("Hello", undefined);

    expect(block).toEqual({
      type: "text",
      text: "Hello",
    });
    expect("annotations" in block).toBe(false);
  });
});

describe("imageBlock", () => {
  it("should create an image block with required fields", () => {
    const block = imageBlock("base64data", "image/png");

    expect(block).toEqual({
      type: "image",
      data: "base64data",
      mimeType: "image/png",
    });
  });

  it("should create an image block with annotations", () => {
    const block = imageBlock("base64data", "image/jpeg", {
      lastModified: "2024-01-01",
    });

    expect(block).toEqual({
      type: "image",
      data: "base64data",
      mimeType: "image/jpeg",
      annotations: {
        lastModified: "2024-01-01",
      },
    });
  });

  it("should not include annotations if undefined", () => {
    const block = imageBlock("data", "image/png", undefined);

    expect(block).toEqual({
      type: "image",
      data: "data",
      mimeType: "image/png",
    });
    expect("annotations" in block).toBe(false);
  });
});
