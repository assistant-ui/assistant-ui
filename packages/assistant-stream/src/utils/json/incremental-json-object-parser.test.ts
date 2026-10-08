import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import {
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";
import { IncrementalJsonObjectParser } from "./incremental-json-object-parser";
import type { ReadonlyJSONObject, ReadonlyJSONValue } from "./json-value";

const inputs = [
  '{"text":"brace } quote \\" slash \\\\ emoji 😀","nested":{"values":[1,-2.5e3,true,false,null]}}',
  '{"escaped":"line\\nfeed","unicode":"\\uD83D\\uDE00"}',
  '{"duplicate":"first","duplicate":"second","tail":0}',
  '{"constructor":1,"tail":"ok"}',
  '{"2":2,"1":1,"nested":{"10":"ten","0":"zero"}}',
  '{\n  "a" : [ 1 , { "b" : true } ] ,\n  "c" : "d"\n}\n',
];

const expectPrefixParity = (input: string) => {
  let prefix = "";
  let expected = parsePartialJsonObject("")!;
  let parser = IncrementalJsonObjectParser.from("");

  expect(parser.currentTextLength).toBe(0);
  expect(parser.currentArgs).toEqual(expected);

  for (const delta of input) {
    prefix += delta;
    parser = parser.append(delta);
    expected = parsePartialJsonObject(prefix) ?? expected;

    expect(parser.currentTextLength).toBe(prefix.length);
    expect(parser.currentArgs, `prefix=${prefix}`).toEqual(expected);
    expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual(
      getPartialJsonObjectMeta(expected),
    );
  }
};

describe("IncrementalJsonObjectParser", () => {
  it.each(inputs)(
    "matches parsePartialJsonObject for every prefix",
    (input) => {
      expectPrefixParity(input);
    },
  );

  it("matches when initialized from an existing prefix", () => {
    const input = inputs[0]!;
    let expected = parsePartialJsonObject("")!;

    for (let cut = 0; cut <= input.length; cut++) {
      const prefix = input.slice(0, cut);
      expected = parsePartialJsonObject(prefix) ?? expected;
      const parser = IncrementalJsonObjectParser.from(prefix);

      expect(parser.currentArgs, `prefix=${prefix}`).toEqual(expected);
      expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual(
        getPartialJsonObjectMeta(expected),
      );
    }
  });

  it.each([
    '{"value":01,"tail":1}',
    '{"value":"\\uZZ","tail":1}',
    '{"__proto__":{"polluted":true},"tail":1}',
    '{"constructor":{"prototype":{"polluted":true}},"tail":1}',
  ])(
    "retains fallback and metadata for malformed or unsafe prefixes",
    (input) => {
      expectPrefixParity(input);
    },
  );

  it("keeps parser branches independent", () => {
    const base = IncrementalJsonObjectParser.from('{"value":"');
    const left = base.append('left"}');
    const right = base.append('right"}');
    const nestedBase = IncrementalJsonObjectParser.from('{"values":[1');
    const nestedLeft = nestedBase.append(",2]}");
    const nestedRight = nestedBase.append(",3]}");

    expect(base.currentArgs).toMatchObject({ value: "" });
    expect(left.currentArgs).toMatchObject({ value: "left" });
    expect(right.currentArgs).toMatchObject({ value: "right" });
    expect(nestedBase.currentArgs).toMatchObject({ values: [1] });
    expect(nestedLeft.currentArgs).toMatchObject({ values: [1, 2] });
    expect(nestedRight.currentArgs).toMatchObject({ values: [1, 3] });
  });

  it("keeps dense arrays immutable across deltas", () => {
    let parser = IncrementalJsonObjectParser.from('{"values":[0');
    const early = parser;

    for (let index = 1; index < 2_000; index++) {
      parser = parser.append(`,${index}`);
    }
    const middle = parser;

    for (let index = 2_000; index < 4_000; index++) {
      parser = parser.append(`,${index}`);
    }
    parser = parser.append("]}");

    expect(early.currentArgs.values).toEqual([0]);
    expect(middle.currentArgs.values).toHaveLength(2_000);
    expect((middle.currentArgs.values as readonly number[]).at(-1)).toBe(1_999);
    expect(parser.currentArgs.values).toHaveLength(4_000);
    expect((parser.currentArgs.values as readonly number[]).at(-1)).toBe(3_999);
    expect(JSON.stringify(parser.currentArgs)).toBe(
      JSON.stringify({
        values: Array.from({ length: 4_000 }, (_, index) => index),
      }),
    );
  });

  it("keeps dense objects immutable across deltas", () => {
    let parser = IncrementalJsonObjectParser.from('{"values":{"key0":0');
    const early = parser;

    for (let index = 1; index < 1_000; index++) {
      parser = parser.append(`,"key${index}":${index}`);
    }
    const middle = parser;

    for (let index = 1_000; index < 2_000; index++) {
      parser = parser.append(`,"key${index}":${index}`);
    }
    parser = parser.append("}}");

    expect(early.currentArgs.values).toEqual({ key0: 0 });
    expect(Object.keys(middle.currentArgs.values as object)).toHaveLength(
      1_000,
    );
    expect(
      (middle.currentArgs.values as Readonly<Record<string, number>>).key999,
    ).toBe(999);
    expect(Object.keys(parser.currentArgs.values as object)).toHaveLength(
      2_000,
    );
    expect(
      (parser.currentArgs.values as Readonly<Record<string, number>>).key1999,
    ).toBe(1_999);
  });

  it("preserves ordinary object and array behavior", () => {
    const parser = IncrementalJsonObjectParser.from(
      '{"values":[1,{"nested":true}]}',
    );
    const values = parser.currentArgs.values as readonly ReadonlyJSONValue[];
    const copy = { ...parser.currentArgs };
    const mutableArgs = parser.currentArgs as Record<string, unknown>;

    expect(Array.isArray(values)).toBe(true);
    expect(Object.keys(parser.currentArgs)).toEqual(["values"]);
    expect(copy.values).toEqual([1, { nested: true }]);
    expect(getPartialJsonObjectMeta(copy)).toEqual(
      getPartialJsonObjectMeta(parser.currentArgs),
    );
    expect(JSON.stringify(parser.currentArgs)).toBe(
      '{"values":[1,{"nested":true}]}',
    );
    expect(structuredClone(parser.currentArgs)).toEqual({
      values: [1, { nested: true }],
    });
    expect(inspect(parser.currentArgs)).toContain("nested: true");

    mutableArgs.extra = "visible";
    expect(mutableArgs.extra).toBe("visible");
  });

  it("isolates complete initial arguments from caller mutations", () => {
    const parser = IncrementalJsonObjectParser.from(
      ' {"values":[1,{"nested":true}],"label":"original"} \n',
    );
    const args = parser.currentArgs as Record<string, unknown>;
    args.label = "changed";
    (args.values as unknown[]).push(2);
    expect(args.values).toEqual([1, { nested: true }, 2]);
    expect(parser.append(" ").currentArgs).toMatchObject({
      values: [1, { nested: true }],
      label: "original",
    });
  });

  it("prevents nested snapshot mutations from changing later snapshots", () => {
    const parser = IncrementalJsonObjectParser.from(
      '{"values":[1,{"nested":true}',
    );
    const values = parser.currentArgs.values as ReadonlyJSONValue[];
    const nested = values[1] as Record<string, ReadonlyJSONValue>;

    values.push(2);
    nested.nested = false;
    expect(values).toEqual([1, { nested: false }, 2]);

    const complete = parser.append("]}");
    expect(complete.currentArgs).toMatchObject({
      values: [1, { nested: true }],
    });
  });

  it("keeps nested references stable when a fallback publishes before its parent", () => {
    const parent = IncrementalJsonObjectParser.from('{"values":[1],"text":"hi');
    const child = parent.append("\\uZZ");
    const args = child.currentArgs;
    const values = args.values as number[];
    values.push(2);

    expect(parent.currentArgs).toBe(args);
    expect(parent.currentArgs.values).toBe(values);
    expect(child.currentArgs.values).toBe(values);
  });

  it("preserves integer-like object keys and their ordinary key order", () => {
    const parser = IncrementalJsonObjectParser.from(
      '{"2":2,"1":1,"nested":{"10":"ten","0":"zero"}}',
    );
    const nested = parser.currentArgs.nested as ReadonlyJSONObject;

    expect(parser.currentArgs["1"]).toBe(1);
    expect(parser.currentArgs["2"]).toBe(2);
    expect(Object.keys(parser.currentArgs)).toEqual(["1", "2", "nested"]);
    expect(Object.keys(nested)).toEqual(["0", "10"]);
    expect(JSON.stringify(parser.currentArgs)).toBe(
      '{"1":1,"2":2,"nested":{"0":"zero","10":"ten"}}',
    );
  });

  it("parses a large array delivered in one delta", () => {
    const values = Array.from({ length: 10_000 }, (_, index) => index + 0.5);
    const parser = IncrementalJsonObjectParser.from(JSON.stringify({ values }));

    expect(parser.currentArgs.values).toEqual(values);
  });
});
