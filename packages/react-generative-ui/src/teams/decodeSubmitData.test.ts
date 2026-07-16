import { describe, expect, it } from "vitest";
import { decodeSubmitData } from "./decodeSubmitData";

describe("decodeSubmitData", () => {
  it("decodes the aui envelope, spreading its payload into the result", () => {
    const value = { aui: { type: "approve", payload: { requestId: "r1" } } };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      requestId: "r1",
    });
  });

  it("collects every other top-level key into $input", () => {
    const value = {
      aui: { type: "approve", payload: { requestId: "r1" } },
      email: "a@b.com",
      subscribe: "true",
    };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      requestId: "r1",
      $input: { email: "a@b.com", subscribe: "true" },
    });
  });

  it("omits $input when there are no other top-level keys", () => {
    expect(decodeSubmitData({ aui: { type: "approve" } })).toEqual({
      type: "approve",
    });
  });

  it("omits payload when the envelope carries none", () => {
    const value = { aui: { type: "approve" }, note: "hi" };
    expect(decodeSubmitData(value)).toEqual({
      type: "approve",
      $input: { note: "hi" },
    });
  });

  it("returns undefined when aui is missing", () => {
    expect(decodeSubmitData({ email: "a@b.com" })).toBeUndefined();
  });

  it("returns undefined for malformed or null input, never throwing", () => {
    const malformed: unknown[] = [
      null,
      undefined,
      42,
      "just a string",
      true,
      [],
      {},
      { aui: "nope" },
      { aui: {} },
      { aui: { type: 123 } },
    ];
    for (const input of malformed) {
      expect(() => decodeSubmitData(input)).not.toThrow();
      expect(decodeSubmitData(input)).toBeUndefined();
    }
  });

  it("never throws even when reading the input itself throws", () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
      },
    );
    expect(() => decodeSubmitData(hostile)).not.toThrow();
    expect(decodeSubmitData(hostile)).toBeUndefined();
  });

  it("returns undefined for a non-empty array activity.value", () => {
    expect(decodeSubmitData([1, 2, 3])).toBeUndefined();
  });

  it("keeps __proto__ and constructor keys from the payload as own data properties without polluting Object.prototype", () => {
    const payload = JSON.parse(
      '{"__proto__": {"evil": true}, "constructor": {"evil": true}}',
    );
    const value = { aui: { type: "approve", payload } };
    const result = decodeSubmitData(value) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(
      true,
    );
    expect(result["__proto__"]).toEqual({ evil: true });
    expect(result["constructor"]).toEqual({ evil: true });
    expect(({} as Record<string, unknown>)["evil"]).toBeUndefined();
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it("keeps __proto__ and constructor keys from $input as own data properties without polluting Object.prototype", () => {
    const value = JSON.parse(
      '{"aui": {"type": "approve"}, "__proto__": "hostile", "constructor": "hostile"}',
    );
    const result = decodeSubmitData(value);
    const input = result?.["$input"] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(input, "__proto__")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(input, "constructor")).toBe(
      true,
    );
    expect(input["__proto__"]).toBe("hostile");
    expect(input["constructor"]).toBe("hostile");
    expect(typeof ({} as object).constructor).toBe("function");
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });
});
