import { describe, it, expect } from "vitest";
import { ThreadPrimitiveShare } from "../primitives/thread/ThreadShare";
import { ActionBarPrimitiveShare } from "../primitives/actionBar/ActionBarShare";

describe("ThreadPrimitiveShare", () => {
  it("has correct display name", () => {
    expect(ThreadPrimitiveShare.displayName).toBe("ThreadPrimitive.Share");
  });
});

describe("ActionBarPrimitiveShare", () => {
  it("has correct display name", () => {
    expect(ActionBarPrimitiveShare.displayName).toBe(
      "ActionBarPrimitive.Share",
    );
  });
});
