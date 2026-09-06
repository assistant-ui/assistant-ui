import { describe, it, expect } from "vitest";
import {
  parsePartialJsonObject,
  getPartialJsonObjectFieldState,
} from "./parse-partial-json-object";

type PartialJsonTest = {
  input: string;
  query: (string | number)[];
  result: "partial" | "complete" | "undefined";
};

const tests: PartialJsonTest[] = [
  // empty query
  {
    input: ``,
    query: [],
    result: "partial",
  },
  {
    input: `{`,
    query: [],
    result: "partial",
  },
  {
    input: `{}`,
    query: [],
    result: "complete",
  },
  // field query (missing)
  {
    input: ``,
    query: ["test"],
    result: "partial",
  },
  {
    input: `{`,
    query: ["test"],
    result: "partial",
  },
  {
    input: `{}`,
    query: ["test"],
    result: "complete",
  },
  // field query (partial)
  {
    input: `{"foo": `,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": "b`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": 123`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": {`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": [`,
    query: ["foo"],
    result: "partial",
  },
  // field query (complete)
  {
    input: `{"foo": 123,`,
    query: ["foo"],
    result: "complete",
  },
  {
    input: `{"foo": "b"`,
    query: ["foo"],
    result: "complete",
  },
  {
    input: `{"foo": nu`,
    query: ["foo"],
    result: "complete",
  },
  {
    input: `{"foo": fa`,
    query: ["foo"],
    result: "complete",
  },
  {
    input: `{"foo": tr`,
    query: ["foo"],
    result: "complete",
  },
  {
    input: `{"foo": {}`,
    query: ["foo"],
    result: "complete",
  },
  {
    input: `{"foo": []`,
    query: ["foo"],
    result: "complete",
  },
  // field query (nested)
  {
    input: `{"foo": [{ "bar": "abc`,
    query: ["foo", "0", "bar"],
    result: "partial",
  },
  {
    input: `{"foo": [{ "bar": "abc"`,
    query: ["foo", "0", "bar"],
    result: "complete",
  },
  {
    input: `{"foo": [{ "bar": 123`,
    query: ["foo", "0", "bar"],
    result: "partial",
  },
  {
    input: `{"foo": [{ "bar": nu`,
    query: ["foo", 0, "bar"],
    result: "complete",
  },
  // field non-existent
  {
    input: `{"bar": "hello"`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"bar": "hello"}`,
    query: ["foo"],
    result: "complete",
  },
  // mismatch type
  {
    input: `{"foo": 123`,
    query: ["foo", "bar", "baz"],
    result: "partial",
  },
  {
    input: `{"foo": fa`,
    query: ["foo", "bar", "baz"],
    result: "complete",
  },
  // numeric keys
  {
    input: `{"1": "value","0":"`,
    query: ["0"],
    result: "partial",
  },
  {
    input: `{"1": "value","0":"`,
    query: ["1"],
    result: "complete",
  },
  {
    input: `{"foo": "value", "0": "`,
    query: ["0"],
    result: "partial",
  },
  {
    input: `{"foo": "value", "0": "`,
    query: ["foo"],
    result: "complete",
  },
  // duplicate keys
  {
    input: `{"foo": "foo","bar":"bar","foo": "`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": "foo","bar":"bar","foo": "`,
    query: ["bar"],
    result: "complete",
  },
  {
    input: `{"foo": [1,"a",{"b":1},[],{},[1,[[2]]],{"1":1,"t":1`,
    query: ["foo", 6, 1],
    result: "complete",
  },
  {
    input: `{"foo": [1,"",{"b":1},[],{},[1,[[2]]],{"1":1,"t":1`,
    query: ["foo", 6, "t"],
    result: "partial",
  },
  {
    input: `{"\\"": "t`,
    query: ['"'],
    result: "partial",
  },
  {
    input: `{"\\"": "t"`,
    query: ['"'],
    result: "complete",
  },
  {
    input: `{"\\u25CF": "t`,
    query: ["\u25CF"],
    result: "partial",
  },
  // negative number whose digits have not arrived yet
  {
    input: `{"foo": [-`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": [-`,
    query: ["foo", 0],
    result: "partial",
  },
  {
    input: `{"foo": [[-`,
    query: ["foo", 0, 0],
    result: "partial",
  },
  // positive exponent whose digits have not arrived yet
  {
    input: `{"foo": 1e+`,
    query: ["foo"],
    result: "partial",
  },
  {
    input: `{"foo": 1e+2`,
    query: ["foo"],
    result: "partial",
  },
];

describe("parsePartialJsonObject and getPartialJsonObjectFieldState", () => {
  // Test each case in the tests array
  tests.forEach((testCase, index) => {
    it(`Test case #${index + 1}: ${testCase.input || `""`} with query ${JSON.stringify(testCase.query)} should return "${testCase.result}"`, () => {
      const args = parsePartialJsonObject(testCase.input);
      if (args === undefined) throw new Error("unable to parse args");

      const fieldState = getPartialJsonObjectFieldState(
        args as Record<string, unknown>,
        testCase.query,
      );

      expect(fieldState).toBe(testCase.result);
    });
  });
});

describe("parsePartialJsonObject inside a unicode escape", () => {
  const full = `{"a":"x\\uD83D\\uDE00y"}`;

  it("returns an object for every prefix of a string containing a surrogate-pair escape", () => {
    for (let cut = 0; cut <= full.length; cut++) {
      expect(
        parsePartialJsonObject(full.slice(0, cut)),
        `cut=${cut}`,
      ).toBeDefined();
    }
  });

  it("omits the unfinished escape from the partial value", () => {
    expect(parsePartialJsonObject(`{"a":"x\\u`)).toMatchObject({ a: "x" });
    expect(parsePartialJsonObject(`{"a":"x\\uD8`)).toMatchObject({ a: "x" });
    expect(parsePartialJsonObject(`{"a":"x\\uD83D\\uDE0`)).toMatchObject({
      a: "x\uD83D",
    });
    expect(parsePartialJsonObject(`{"a":"x\\uD83D\\uDE00y`)).toMatchObject({
      a: "x😀y",
    });
  });

  it("keeps the partial path through an escape cut inside a value", () => {
    const args = parsePartialJsonObject(`{"a":"x\\uD8`)!;
    expect(getPartialJsonObjectFieldState(args, ["a"])).toBe("partial");
  });

  it("handles an escape cut inside an object key", () => {
    expect(Object.keys(parsePartialJsonObject(`{"\\u00e9`)!)).toEqual([]);
    expect(parsePartialJsonObject(`{"\\u00e9":1`)).toMatchObject({ é: 1 });
    expect(parsePartialJsonObject(`{"\\u00e9":"v`)).toMatchObject({ é: "v" });
  });

  it("keeps malformed escapes unparseable", () => {
    expect(parsePartialJsonObject(`{"a":"\\uZZ`)).toBeUndefined();
    expect(parsePartialJsonObject(`{"a":"\\u"}`)).toBeUndefined();
    expect(parsePartialJsonObject(`{"a":"\\u12"}`)).toBeUndefined();
  });

  it("leaves single-char escapes unchanged", () => {
    expect(parsePartialJsonObject(`{"a":"x\\n`)).toMatchObject({ a: "x\n" });
    expect(parsePartialJsonObject(`{"a":"x\\`)).toMatchObject({ a: "x" });
    expect(parsePartialJsonObject(`{"a":"x\\"`)).toMatchObject({ a: 'x"' });
  });
});
