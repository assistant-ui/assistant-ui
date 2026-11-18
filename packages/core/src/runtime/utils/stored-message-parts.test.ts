import { describe, expect, it } from "vitest";
import {
  isStoredAuiV0RolePart,
  isStoredMessagePart,
  parseStoredAttachment,
  withoutInvalidOptionals,
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
    ["a file whose filename is not a string", { ...file, filename: 3 }],
    ["a file with an unknown source type", { ...file, sourceType: 42 }],
    ["an image with a null filename", { ...image, filename: null }],
    ["an image whose filename is not a string", { ...image, filename: {} }],
    ["a url source", urlSource],
    ["a url source with a title", { ...urlSource, title: "A" }],
    ["a url source with a null title", { ...urlSource, title: null }],
    ["a url source whose title is not a string", { ...urlSource, title: {} }],
    ["a document source", documentSource],
    [
      "a document source with a filename",
      { ...documentSource, filename: "d.pdf" },
    ],
    [
      "a document source whose filename is not a string",
      { ...documentSource, filename: [] },
    ],
  ])("keeps %s", (_label, part) => {
    expect(isStoredMessagePart(part)).toBe(true);
    expect(isStoredAuiV0RolePart("assistant", part)).toBe(true);
    if (part.type !== "source")
      expect(isStoredAuiV0RolePart("user", part)).toBe(true);
  });

  it.each([
    ["a file without a mime type", { type: "file", data: "abc" }],
    ["a file whose data is not a string", { ...file, data: { x: 1 } }],
    ["an image whose image is not a string", { ...image, image: 5 }],
    ["a url source without a url", { ...urlSource, url: undefined }],
    ["a url source whose id is not a string", { ...urlSource, id: 1 }],
    ["a document source without a title", { ...documentSource, title: null }],
    [
      "a document source whose media type is not a string",
      { ...documentSource, mediaType: 2 },
    ],
    ["a source with an unknown source type", { ...urlSource, sourceType: "x" }],
  ])("drops %s", (_label, part) => {
    expect(isStoredMessagePart(part)).toBe(false);
    expect(isStoredAuiV0RolePart("assistant", part)).toBe(false);
    expect(isStoredAuiV0RolePart("user", part)).toBe(false);
  });
});

describe("withoutInvalidOptionals", () => {
  it("removes null optional fields from file, image and source parts", () => {
    expect(
      withoutInvalidOptionals({ ...file, filename: null, sourceType: null }),
    ).toEqual(file);
    expect(withoutInvalidOptionals({ ...image, filename: null })).toEqual(
      image,
    );
    expect(withoutInvalidOptionals({ ...urlSource, title: null })).toEqual(
      urlSource,
    );
  });

  it("removes optional fields of the wrong type and keeps the rest", () => {
    expect(
      withoutInvalidOptionals({ ...file, filename: 3, sourceType: 42 }),
    ).toEqual(file);
    expect(
      withoutInvalidOptionals({ ...file, filename: "a", sourceType: "blob" }),
    ).toEqual({ ...file, filename: "a" });
    expect(withoutInvalidOptionals({ ...image, filename: {} })).toEqual(image);
    expect(withoutInvalidOptionals({ ...urlSource, title: {} })).toEqual(
      urlSource,
    );
    expect(
      withoutInvalidOptionals({ ...documentSource, filename: [] }),
    ).toEqual(documentSource);
  });

  it("returns a well-formed part as is", () => {
    const part = { ...file, filename: "a", sourceType: "id" };
    expect(withoutInvalidOptionals(part)).toBe(part);
  });

  it("leaves other part types untouched", () => {
    const extension = { type: "x-ext", title: null, filename: 3 };
    expect(withoutInvalidOptionals(extension)).toBe(extension);
  });
});

describe("parseStoredAttachment", () => {
  it.each([
    ["local storage", isStoredMessagePart],
    ["cloud", (value: unknown) => isStoredAuiV0RolePart("user", value)],
  ] as const)(
    "removes malformed optional fields from %s attachment parts",
    (_label, isPart) => {
      const attachment = parseStoredAttachment(
        {
          id: "att",
          type: "file",
          name: "a.txt",
          status: { type: "complete" },
          content: [
            { ...file, filename: null, sourceType: null },
            { ...file, filename: 3, sourceType: "blob" },
          ],
        },
        isPart as typeof isStoredMessagePart,
      );
      expect(attachment?.content).toEqual([file, file]);
    },
  );
});
