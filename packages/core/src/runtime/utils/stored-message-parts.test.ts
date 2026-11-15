import { describe, expect, it } from "vitest";
import {
  isStoredAuiV0RolePart,
  isStoredMessagePart,
  parseStoredAttachment,
  withoutNullOptionals,
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
    [
      "a file with a null filename and source type",
      { ...file, filename: null, sourceType: null },
    ],
    ["an image with a null filename", { ...image, filename: null }],
    ["a url source with a null title", { ...urlSource, title: null }],
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
    if (part.type !== "source")
      expect(isStoredAuiV0RolePart("user", part)).toBe(true);
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
    expect(isStoredAuiV0RolePart("user", part)).toBe(false);
  });
});

describe("withoutNullOptionals", () => {
  it("removes null optional fields from file, image and source parts", () => {
    expect(
      withoutNullOptionals({ ...file, filename: null, sourceType: null }),
    ).toEqual(file);
    expect(withoutNullOptionals({ ...image, filename: null })).toEqual(image);
    expect(withoutNullOptionals({ ...urlSource, title: null })).toEqual(
      urlSource,
    );
  });

  it("leaves other part types untouched", () => {
    const extension = { type: "x-ext", title: null, filename: null };
    expect(withoutNullOptionals(extension)).toBe(extension);
  });
});

describe("parseStoredAttachment", () => {
  it.each([
    ["local storage", isStoredMessagePart],
    ["cloud", (value: unknown) => isStoredAuiV0RolePart("user", value)],
  ] as const)(
    "removes null optional fields from %s attachment parts",
    (_label, isPart) => {
      const attachment = parseStoredAttachment(
        {
          id: "att",
          type: "file",
          name: "a.txt",
          status: { type: "complete" },
          content: [{ ...file, filename: null, sourceType: null }],
        },
        isPart as typeof isStoredMessagePart,
      );
      expect(attachment?.content).toEqual([file]);
    },
  );
});
