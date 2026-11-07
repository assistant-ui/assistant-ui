// @vitest-environment node
import { describe, expect, it } from "vitest";
import { initialElicitationDraft } from "./initialElicitationDraft";

describe("initialElicitationDraft non-finite defaults", () => {
  it("keeps finite defaults that match their declared types", () => {
    expect(
      initialElicitationDraft({
        properties: {
          name: { type: "string", default: "Ada" },
          ratio: { type: "number", default: 0.5 },
          count: { type: "integer", default: 3 },
          enabled: { type: "boolean", default: false },
        },
      }),
    ).toEqual({ name: "Ada", ratio: 0.5, count: 3, enabled: false });
  });

  it("does not seed NaN / Infinity into a form that will reject them", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(
        initialElicitationDraft({
          properties: {
            ratio: { type: "number", default: bad },
            count: { type: "integer", default: bad },
          },
        }),
      ).toEqual({});
    }
  });

  it("omits only the invalid fields", () => {
    expect(
      initialElicitationDraft({
        properties: {
          ratio: { type: "number", default: Infinity },
          label: { type: "string", default: "ok" },
        },
      }),
    ).toEqual({ label: "ok" });
  });
});
