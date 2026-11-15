import { describe, expect, it } from "vitest";
import {
  isStoredAuiV0RolePart,
  isStoredMessagePart,
} from "./stored-message-parts";

const file = { type: "file", data: "abc", mimeType: "text/plain" };
const image = { type: "image", image: "https://a.test/a.png" };
const urlSource = {
  type: "source",
  sourceType: "url",
  id: "u",
  url: "https://a.test",
};
const documentSource = {
  type: "source",
  sourceType: "document",
  id: "d",
  title: "D",
  mediaType: "application/pdf",
};

describe("stored part guards", () => {
  it.each([
    ["a file", file],
    [
      "a file with a filename and a url source type",
      { ...file, filename: "a", sourceType: "url" },
    ],
    ["an image with a filename", { ...image, filename: "a.png" }],
    ["a url source", urlSource],
    ["a url source with a title", { ...urlSource, title: "A" }],
    ["a document source", documentSource],
    [
      "a document source with a filename",
      { ...documentSource, filename: "d.pdf" },
    ],
  ])("keeps %s", (_label, part) => {
    expect(isStoredMessagePart(part)).toBe(true);
    expect(isStoredAuiV0RolePart("assistant", part)).toBe(true);
  });

  it.each([
    ["a file whose filename is not a string", { ...file, filename: 3 }],
    ["a file with an unknown source type", { ...file, sourceType: 42 }],
    ["an image whose filename is not a string", { ...image, filename: {} }],
    ["a url source whose title is not a string", { ...urlSource, title: {} }],
    [
      "a document source whose filename is not a string",
      { ...documentSource, filename: [] },
    ],
  ])("drops %s", (_label, part) => {
    expect(isStoredMessagePart(part)).toBe(false);
    expect(isStoredAuiV0RolePart("assistant", part)).toBe(false);
  });
});
