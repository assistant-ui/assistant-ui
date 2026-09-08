import { describe, expect, it } from "vitest";
import { nullProtoRecord } from "./record";

describe("nullProtoRecord", () => {
  it("has no prototype", () => {
    expect(Object.getPrototypeOf(nullProtoRecord())).toBeNull();
    expect(Object.getPrototypeOf(nullProtoRecord({ a: 1 }))).toBeNull();
  });

  it("copies own entries from every source, later sources winning", () => {
    expect({ ...nullProtoRecord({ a: 1, b: 2 }, undefined, { b: 3 }) }).toEqual(
      {
        a: 1,
        b: 3,
      },
    );
  });

  it.each(["__proto__", "constructor", "toString"])(
    "assigns %s as an own property",
    (key) => {
      const record = nullProtoRecord<number>();
      record[key] = 1;

      expect(Object.hasOwn(record, key)).toBe(true);
      expect(record[key]).toBe(1);
      expect(Object.keys(record)).toEqual([key]);
    },
  );

  it.each(["__proto__", "constructor", "toString"])(
    "carries %s through a source",
    (key) => {
      const record = nullProtoRecord<number>({ [key]: 1, ok: 2 });

      expect(Object.keys(record)).toEqual([key, "ok"]);
      expect(record[key]).toBe(1);
    },
  );

  it("reads an absent prototype-named key as undefined", () => {
    const record = nullProtoRecord<number>({ ok: 1 });

    expect(record["__proto__"]).toBeUndefined();
    expect(record["constructor"]).toBeUndefined();
    expect(record["toString"]).toBeUndefined();
  });
});
