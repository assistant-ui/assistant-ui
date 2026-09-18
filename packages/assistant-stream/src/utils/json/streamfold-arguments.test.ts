import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { IncrementalJsonScanner, StructuredStreamPool } from "streamfold";
import type { ToolCallPart } from "../../core/utils/types";
import { prepareStreamfold, StreamfoldArguments } from "./streamfold-arguments";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";

const part = (argsText = "", toolCallId = "call"): ToolCallPart => ({
  type: "tool-call",
  toolCallId,
  toolName: "weather",
  argsText,
  args: {},
  state: "partial-call",
  status: { type: "running", isArgsComplete: false },
});

const json = (value: unknown) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

const fixtures = [
  "",
  "   ",
  "{}",
  "[]",
  "null",
  "true",
  '"text"',
  '{"city":"San Francisco","units":"celsius"}',
  '{"items":[{"name":"one"},{"name":"two"}],"ok":true}',
  '{"items":[-1,1.2e-3,true,false,null,[],{}]}',
  '{"a":1e+2,"b":-0,"c":0.123456789}',
  '{"items":[[-1],[-2]],"nested":{"a":{"b":"c"}}}',
  '{"items":[1,2,]}',
  '{"items":[1,2,,3]}',
  '{"a":"old","b":"ok","a":"new"}',
  '{"a":{"b":"old"},"a":{"c":"new"}}',
  '{"1":"one","0":"zero","2":"two"}',
  '{"a":"x\\uD83D\\uDE00y"}',
  '{"\\u00e9":"\\u00e9","\\\"":"a\\\"b\\nc"}',
  '{"a":"x\\uZZ"}',
  '{"a":"x\\u12"}',
  '{"a":"x\\q"}',
  '{"a":"hello"}garbage',
  '{"a":01}',
  '{"a":1.}',
  '{"a":+1}',
  '{"a":undefined}',
  '{"a":NaN}',
  '{"a":true false}',
  '{"a":"ok","__proto__":{"polluted":true}}',
  '{"constructor":{"prototype":{"polluted":true}}}',
  '{"\\u005f_proto__":{"x":1}}',
  '{"constructor":{"\\u0070rototype":null}}',
  '{"constructor":"ordinary","prototype":true,"toString":"own"}',
  '{"a":"😀 café 漢字"}',
  '{"a":"\ud800"}',
  '{"a":"\udc00"}',
  '{"\ud800":"value"}',
  '{"a":"\\uD800"}',
  '{"a":"\\uDC00"}',
  '[1,"a",{"b":1},[],{},[1,[[2]]],{"1":1,"t":1}]',
  ...Array.from({ length: 30 }, (_, i) =>
    JSON.stringify({
      index: i,
      items: [i % 2 === 0, null, { [String(i)]: `item ${i} " \\ 😀` }],
      number: (i - 17) / 13,
      nested: { [i % 3 === 0 ? "constructor" : "field"]: [i, -i] },
    }),
  ),
];

describe("StreamfoldArguments compatibility", () => {
  beforeAll(prepareStreamfold);
  afterEach(() => vi.restoreAllMocks());

  it.each(fixtures)("matches every prefix of %j", (text) => {
    const parser = new StreamfoldArguments();
    try {
      for (let end = 0; end <= text.length; end++) {
        const prefix = text.slice(0, end);
        const start = Math.max(0, end - 1);
        const actual = parser.read(
          0,
          part(text.slice(0, start)),
          text.slice(start, end),
        );
        const expected = parsePartialJsonObject(prefix);
        expect(json(actual), prefix).toEqual(json(expected));
        if (actual && expected) {
          expect(getPartialJsonObjectMeta(actual), prefix).toEqual(
            getPartialJsonObjectMeta(expected),
          );
          for (const key of [...Object.keys(expected), "missing"])
            expect(getPartialJsonObjectFieldState(actual, [key]), prefix).toBe(
              getPartialJsonObjectFieldState(expected, [key]),
            );
        }
      }
    } finally {
      parser.dispose();
    }
  });

  it("uses the adapter and feeds only new text after initialization", () => {
    const push = vi.spyOn(StructuredStreamPool.prototype, "push");
    const parser = new StreamfoldArguments();
    parser.read(0, part(), '{"city":"San');
    parser.read(0, part('{"city":"San'), ' Francisco"}');
    expect(push.mock.calls.map((call) => call[1])).toEqual([
      '{"city":"San',
      ' Francisco"}',
    ]);
    parser.dispose();
  });

  it("matches legacy repair across deterministic malformed-input mutations", () => {
    const seed = '{"a":[1,true,{"b":"text"}],"c":null}';
    for (let index = 0; index < seed.length; index++) {
      for (const token of ["", ",", ":", "0", "-", "\\", '"', "]", "}", "q"]) {
        const text = seed.slice(0, index) + token + seed.slice(index + 1);
        for (const size of [1, 3, 7]) {
          const parser = new StreamfoldArguments();
          try {
            for (let offset = 0; offset < text.length; offset += size) {
              const prefix = text.slice(0, offset + size);
              const actual = parser.read(
                0,
                part(text.slice(0, offset)),
                text.slice(offset, offset + size),
              );
              const expected = parsePartialJsonObject(prefix);
              expect(json(actual), `${size}: ${prefix}`).toEqual(
                json(expected),
              );
              if (actual && expected)
                expect(
                  getPartialJsonObjectMeta(actual),
                  `${size}: ${prefix}`,
                ).toEqual(getPartialJsonObjectMeta(expected));
            }
          } finally {
            parser.dispose();
          }
        }
      }
    }
  });

  it("preserves earlier nested values and field status", () => {
    const parser = new StreamfoldArguments();
    const before = parser.read(0, part(), '{"items":[{"name":"a');
    parser.read(0, part('{"items":[{"name":"a'), 'b"}]}');
    parser.dispose();
    expect(json(before)).toEqual({ items: [{ name: "a" }] });
    expect(getPartialJsonObjectFieldState(before!, ["items", 0, "name"])).toBe(
      "partial",
    );
  });

  it("seeds resumed arguments and isolates duplicate call IDs at distinct paths", () => {
    const parser = new StreamfoldArguments();
    expect(json(parser.read(0, part('{"city":"San'), ' Francisco"}'))).toEqual({
      city: "San Francisco",
    });
    expect(json(parser.read(1, part('{"city":"New'), ' York"}'))).toEqual({
      city: "New York",
    });
    parser.dispose();
  });

  it("keeps a malformed call from disabling another call's parser", () => {
    const push = vi.spyOn(StructuredStreamPool.prototype, "push");
    const parser = new StreamfoldArguments();
    parser.read(0, part(), '{"a":"bad\\q');
    parser.read(1, part(), '{"city":"San');
    parser.read(1, part('{"city":"San'), ' Francisco"}');
    expect(push.mock.calls.at(-1)?.[1]).toBe(' Francisco"}');
    parser.dispose();
  });

  it("falls back when WASM instantiation fails", () => {
    vi.spyOn(StructuredStreamPool.prototype, "start").mockImplementation(() => {
      throw new Error("WASM blocked by content security policy");
    });
    const parser = new StreamfoldArguments();
    expect(json(parser.read(0, part(), '{"city":"San'))).toEqual({
      city: "San",
    });
    expect(json(parser.read(0, part('{"city":"San'), ' Francisco"}'))).toEqual({
      city: "San Francisco",
    });
    parser.dispose();
  });

  it("falls back beyond the optimization's depth limit", () => {
    const text = '{"a":' + "[".repeat(130) + "1" + "]".repeat(130) + "}";
    const parser = new StreamfoldArguments();
    expect(json(parser.read(0, part(), text))).toEqual(
      json(parsePartialJsonObject(text)),
    );
    parser.dispose();
  });

  it("releases resources without finalizing truncated arguments", () => {
    const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
    const parser = new StreamfoldArguments();
    const args = parser.read(0, part(), '{"city":"San');
    parser.release(0);
    parser.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(getPartialJsonObjectFieldState(args!, ["city"])).toBe("partial");
  });
});
