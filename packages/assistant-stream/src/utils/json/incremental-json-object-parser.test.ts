import { describe, expect, it } from "vitest";
import {
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";
import { IncrementalJsonObjectParser } from "./incremental-json-object-parser";

const inputs = [
  '{"text":"brace } quote \\" slash \\\\ emoji 😀","nested":{"values":[1,-2.5e3,true,false,null]}}',
  '{"escaped":"line\\nfeed","unicode":"\\uD83D\\uDE00"}',
  '{"duplicate":"first","duplicate":"second","tail":0}',
  '{"constructor":1,"tail":"ok"}',
  '{\n  "a" : [ 1 , { "b" : true } ] ,\n  "c" : "d"\n}\n',
];

const expectPrefixParity = (input: string) => {
  let prefix = "";
  let expected = parsePartialJsonObject("")!;
  let parser = IncrementalJsonObjectParser.from("");

  expect(parser.currentText).toBe("");
  expect(parser.currentArgs).toEqual(expected);

  for (const delta of input) {
    prefix += delta;
    parser = parser.append(delta);
    expected = parsePartialJsonObject(prefix) ?? expected;

    expect(parser.currentText).toBe(prefix);
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

    expect(base.currentArgs).toMatchObject({ value: "" });
    expect(left.currentArgs).toMatchObject({ value: "left" });
    expect(right.currentArgs).toMatchObject({ value: "right" });
  });
});
