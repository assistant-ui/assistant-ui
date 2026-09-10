import { describe, expect, it } from "vitest";
import { IncrementalPartialJsonObjectParser } from "./incremental-partial-json-object-parser";
import {
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";

const inputs = [
  '{"text":"brace } quote \\" slash \\\\ emoji 😀","nested":{"values":[1,-2500,true,false,null,{"value":"x"}]}}',
  '{"escaped":"line\\nfeed","unicode":"\\uD83D\\uDE00"}',
  '{"negative":-12.5,"positiveExponent":1e+2,"negativeExponent":-3.5E-2}',
  '{"duplicate":"first","duplicate":"second","tail":0}',
  '{"constructor":1,"tail":"ok"}',
  '{\n  "a" : [ 1 , { "b" : true } ] ,\n  "c" : "d"\n}\n',
  '  {"a":1}',
];

type GeneratedJSON =
  | null
  | boolean
  | number
  | string
  | GeneratedJSON[]
  | { [key: string]: GeneratedJSON };

const generatedJsonObjects = () => {
  let state = 0x7166;
  const random = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const pick = <T>(values: readonly T[]) =>
    values[Math.floor(random() * values.length)]!;
  const strings = [
    "",
    "plain",
    'quote"slash\\',
    "line\nfeed\ttab",
    "emoji 😀",
    "constructor",
  ];
  const numbers = [0, -1, 12.5, -3.5e-2, 1e21];

  const value = (depth: number): GeneratedJSON => {
    const kind = Math.floor(random() * (depth < 3 ? 6 : 4));
    if (kind === 0) return null;
    if (kind === 1) return random() < 0.5;
    if (kind === 2) return pick(numbers);
    if (kind === 3) return pick(strings);
    if (kind === 4) {
      return Array.from({ length: Math.floor(random() * 4) }, () =>
        value(depth + 1),
      );
    }

    return Object.fromEntries(
      Array.from({ length: Math.floor(random() * 4) }, (_, index) => [
        `${pick(strings)}-${index}`,
        value(depth + 1),
      ]),
    );
  };

  return Array.from({ length: 30 }, (_, index) => ({
    [`field-${index}`]: value(0),
    nested: value(0),
  }));
};

describe("IncrementalPartialJsonObjectParser", () => {
  it.each(inputs)("matches the full parser for every prefix of %s", (input) => {
    let parser = IncrementalPartialJsonObjectParser.from("");
    let prefix = "";
    let expected = parsePartialJsonObject("")!;

    for (const char of input) {
      prefix += char;
      const parsed = parsePartialJsonObject(prefix);
      if (prefix.trim().length > 0) expect(parsed).toBeDefined();
      expected = parsed ?? expected;
      parser = parser.append(char, prefix);

      expect(parser.currentText).toBe(prefix);
      expect(parser.currentArgs, `prefix=${prefix}`).toEqual(expected);
      expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual(
        getPartialJsonObjectMeta(expected),
      );
    }
  });

  it("matches the full parser for generated JSON object prefixes", () => {
    for (const document of generatedJsonObjects()) {
      const input = JSON.stringify(document);
      let parser = IncrementalPartialJsonObjectParser.from("");
      let prefix = "";

      for (const char of input) {
        const expected = parsePartialJsonObject(prefix);
        if (expected === undefined) {
          throw new Error(`reference parser rejected prefix=${prefix}`);
        }
        expect(parser.currentArgs, `input=${input} prefix=${prefix}`).toEqual(
          expected,
        );
        expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual(
          getPartialJsonObjectMeta(expected),
        );

        prefix += char;
        parser = parser.append(char, prefix);
      }

      const expected = parsePartialJsonObject(input)!;
      expect(parser.currentArgs).toEqual(expected);
      expect(getPartialJsonObjectMeta(parser.currentArgs)).toEqual(
        getPartialJsonObjectMeta(expected),
      );
    }
  });

  it("keeps branches independent", () => {
    const prefix = IncrementalPartialJsonObjectParser.from('{"choice":"');
    const left = prefix.append('left"}');
    const right = prefix.append('right"}');

    expect(left.currentArgs).toMatchObject({ choice: "left" });
    expect(right.currentArgs).toMatchObject({ choice: "right" });
    expect(prefix.currentArgs).toMatchObject({ choice: "" });
  });

  it("retains the last valid value after an invalid number prefix", () => {
    const parser =
      IncrementalPartialJsonObjectParser.from('{"value":0').append("1");

    expect(parser.currentArgs).toMatchObject({ value: 0 });
  });

  it("retains the prior value for constructor prototype payloads", () => {
    const input = '{"constructor":{"prototype":{}},"tail":1}';
    let parser = IncrementalPartialJsonObjectParser.from("");
    let expected = parsePartialJsonObject("")!;
    let prefix = "";

    for (const char of input) {
      prefix += char;
      expected = parsePartialJsonObject(prefix) ?? expected;
      parser = parser.append(char, prefix);
      expect(parser.currentArgs, `prefix=${prefix}`).toEqual(expected);
    }

    expect(parser.currentArgs).toMatchObject({ constructor: {} });
    expect(parser.currentArgs).not.toHaveProperty("tail");
  });
});
