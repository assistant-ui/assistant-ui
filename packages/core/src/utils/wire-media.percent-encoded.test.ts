import { describe, expect, it } from "vitest";
import { toMediaWireUrl } from "./wire-media";

describe("toMediaWireUrl percent-encoded base64", () => {
  it("decodes escapes when the declared media type matches", () => {
    expect(toMediaWireUrl("data:image/png;base64,aGk%3D", "image/png")).toBe(
      "data:image/png;base64,aGk=",
    );
  });

  it("keeps an unescaped data URL identical", () => {
    const payload = "data:image/png;base64,aGk=";
    expect(toMediaWireUrl(payload, "image/png")).toBe(payload);
  });
});
