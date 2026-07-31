// @vitest-environment node

import { describe, expect, it } from "vitest";
import { initialElicitationDraft } from "./initialElicitationDraft";

describe("initialElicitationDraft", () => {
  it("seeds defaults that match their declared types", () => {
    expect(
      initialElicitationDraft({
        type: "object",
        properties: {
          enabled: { type: "boolean", default: true },
          name: { type: "string", default: "Ada" },
          ratio: { type: "number", default: 1.5 },
          count: { type: "integer", default: 2 },
        },
      }),
    ).toEqual({ enabled: true, name: "Ada", ratio: 1.5, count: 2 });
  });

  it("skips defaults that do not match their declared types", () => {
    expect(
      initialElicitationDraft({
        type: "object",
        properties: {
          enabled: { type: "boolean", default: "true" },
          name: { type: "string", default: 1 },
          ratio: { type: "number", default: "1.5" },
          count: { type: "integer", default: 1.5 },
        },
      }),
    ).toEqual({});
  });
});
