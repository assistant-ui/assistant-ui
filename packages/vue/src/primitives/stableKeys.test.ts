import { describe, expect, it } from "vitest";
import { getAttachmentKeys } from "./stableKeys";

describe("getAttachmentKeys", () => {
  it("keys unique attachments by id and repeated ids by position", () => {
    expect(
      getAttachmentKeys([{ id: "a" }, { id: "b" }, { id: "a" }, { id: "c" }]),
    ).toEqual(["attachment@0", "attachment:b", "attachment@2", "attachment:c"]);
  });

  it("never lets an id collide with a positional key", () => {
    const keys = getAttachmentKeys([
      { id: "x" },
      { id: "x" },
      { id: "attachment@0" },
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
