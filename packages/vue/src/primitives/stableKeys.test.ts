import { describe, expect, it } from "vitest";
import { getAttachmentKeys } from "./stableKeys";

describe("getAttachmentKeys", () => {
  it("keys unique attachments by id and repeated ids by position", () => {
    expect(
      getAttachmentKeys([{ id: "a" }, { id: "b" }, { id: "a" }, { id: "c" }]),
    ).toEqual(["attachment@0", "b", "attachment@2", "c"]);
  });
});
