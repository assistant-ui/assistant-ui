import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import assert from "node:assert/strict";
import { DEFAULT_STREAM_LIMITS, StructuredStreamPool } from "streamfold";
import type { ToolCallPart } from "../../core/utils/types";
import type { ReadonlyJSONObject } from "./json-value";
import { prepareStreamfold, StreamfoldArguments } from "./streamfold-arguments";
import {
  getPartialJsonObjectFieldState,
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";

const part = (argsText = ""): ToolCallPart => ({
  type: "tool-call",
  toolCallId: "shared-id",
  toolName: "example",
  argsText,
  args: {},
  state: "partial-call",
  status: { type: "running", isArgsComplete: false },
});
const warmup = '{"warmup":"' + "x".repeat(4096);
const suffixes = [
  '","data":{"n":-0,"small":1.2345678901234567,"large":9007199254740993,"text":"ok"}}',
  '","data":{"n":-0,"small":1.2345678901234567,"large":9007199254740993,"exponent":1e309,"text":"ok"}}',
  '","data":{"items":[true,false,null,-1,1.2e-3,{},[],{"value":"abc"}]}}',
  '","data":{"0":"zero","01":"one","a/b":"slash","a~b":"tilde","":"empty"}}',
  '","data":{"a":"old","a":"new","nested":{"a":"old"},"nested":{"b":"new"}}}',
  '","data":{"quote":"a\\\"b","slash":"a\\\\b","control":"a\\nb\\tc","unicode":"\\u00e9\\uD83D\\uDE00"}}',
  '","data":{"raw":"😀 café 漢字","escaped":"\\uD800","lone":"\udc00"}}',
  '","data":{"__proto__":{"polluted":true},"text":"abc"}}',
  '","data":{"constructor":{"prototype":{"polluted":true}},"text":"abc"}}',
  '","data":{"\\u005f_proto__":{"polluted":true},"text":"abc"}}',
  '","data":{"constructor":"ordinary","prototype":true,"toString":"own","text":"abc"}}',
  '","data":[1,2,,3],"text":"abc"}',
  '","data":{"a":01,"text":"abc"}}',
  '","data":{"a":true false,"text":"abc"}}',
  '","data":{"a":"bad\\q","text":"abc"}}',
  '","data":{"a":"bad\\uZZ","text":"abc"}}',
  '\\uD83D\\uDE00"}',
  '\\uD800"}',
  "\\u12",
  '\\q"}',
  '\n"}',
  '"}garbage',
];

const compare = (actual: ReadonlyJSONObject | undefined, text: string) => {
  const expected = parsePartialJsonObject(text);
  assert.deepStrictEqual(actual, expected, text.slice(4096));
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
  if (!actual || !expected) return;
  expect(getPartialJsonObjectMeta(actual)).toEqual(
    getPartialJsonObjectMeta(expected),
  );
  for (const path of [
    ["warmup"],
    ["data"],
    ["data", "a"],
    ["data", "items", 0],
    ["missing"],
  ]) {
    expect(getPartialJsonObjectFieldState(actual, path)).toBe(
      getPartialJsonObjectFieldState(expected, path),
    );
  }
};

describe("Streamfold arguments after activation", () => {
  beforeAll(prepareStreamfold);
  afterEach(() => vi.restoreAllMocks());

  it.each(suffixes)("preserves values and metadata after %j", (suffix) => {
    const push = vi.spyOn(StructuredStreamPool.prototype, "push");
    for (const size of [1, 3, 17]) {
      const parser = new StreamfoldArguments();
      let text = warmup;
      try {
        compare(parser.read(0, part(), text), text);
        for (let offset = 0; offset < suffix.length; offset += size) {
          const delta = suffix.slice(offset, offset + size);
          const actual = parser.read(0, part(text), delta);
          text += delta;
          compare(actual, text);
        }
      } finally {
        parser.dispose();
      }
    }
    expect(push).toHaveBeenCalled();
  });

  it("matches malformed suffix mutations after the optimized parser is active", () => {
    const suffix = '","data":[1,true,{"value":"text"}],"last":"ok"}';
    for (let index = 0; index < suffix.length; index++) {
      for (const token of ["", ",", ":", "0", "-", "\\", '"', "]", "}", "q"]) {
        const mutated =
          suffix.slice(0, index) + token + suffix.slice(index + 1);
        const parser = new StreamfoldArguments();
        let text = warmup;
        try {
          parser.read(0, part(), text);
          for (let offset = 0; offset < mutated.length; offset += 3) {
            const delta = mutated.slice(offset, offset + 3);
            const actual = parser.read(0, part(text), delta);
            text += delta;
            compare(actual, text);
          }
        } finally {
          parser.dispose();
        }
      }
    }
  });

  it("isolates and releases 128 interleaved active calls with duplicate IDs", () => {
    const start = vi.spyOn(StructuredStreamPool.prototype, "start");
    const parser = new StreamfoldArguments();
    const previous = [];
    try {
      for (let index = 0; index < 128; index++)
        previous.push(parser.read(index, part(), warmup));
      expect(start).toHaveBeenCalledTimes(128);
      for (let index = 127; index >= 0; index--) {
        const suffix = `${index}"}`;
        compare(parser.read(index, part(warmup), suffix), warmup + suffix);
        compare(previous[index], warmup);
        parser.release(index);
      }
    } finally {
      parser.dispose();
    }
    for (const pool of start.mock.contexts as StructuredStreamPool<string>[])
      expect(pool.activeIds).toEqual([]);
  });

  it("preserves array roots after activating inside their first element", () => {
    const parser = new StreamfoldArguments();
    let text = '["' + "x".repeat(4096);
    try {
      compare(parser.read(0, part(), text), text);
      for (const delta of ["y", '",', '{"nested":[1,true,"a', 'b"]}]']) {
        const actual = parser.read(0, part(text), delta);
        text += delta;
        compare(actual, text);
      }
    } finally {
      parser.dispose();
    }
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "re-seeds nested long strings across pauses (seed %s)",
    (seed) => {
      let state = seed;
      const alphabet =
        seed % 2
          ? ["a", "b", '"', "\\", "\n", "\t"]
          : ["é", "漢", "😀", '"', "\\", "\ud800"];
      const value = Array.from({ length: 3200 }, () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return alphabet[state % alphabet.length];
      }).join("");
      const text = JSON.stringify({
        first: "x".repeat(4200),
        items: [1, null, { value }],
        final: "z".repeat(4200),
      });
      for (const size of [7, 31, 257]) {
        const parser = new StreamfoldArguments();
        try {
          for (let offset = 0; offset < text.length; offset += size) {
            const delta = text.slice(offset, offset + size);
            compare(
              parser.read(0, part(text.slice(0, offset)), delta),
              text.slice(0, offset + size),
            );
          }
        } finally {
          parser.dispose();
        }
      }
    },
  );

  it("re-seeds after structural changes before retaining a later long string", () => {
    const start = vi.spyOn(StructuredStreamPool.prototype, "start");
    const parser = new StreamfoldArguments();
    let text = '{"first":"' + "x".repeat(4096);
    try {
      compare(parser.read(0, part(), text), text);
      const structural =
        '","count":1,"ready":true,"second":"' + "y".repeat(4096);
      compare(parser.read(0, part(text), structural), text + structural);
      text += structural;
      expect(start).toHaveBeenCalledOnce();
      expect(
        (start.mock.contexts[0] as StructuredStreamPool<string>).activeIds,
      ).toEqual([]);

      compare(parser.read(0, part(text), "z"), text + "z");
      expect(start).toHaveBeenCalledTimes(2);
    } finally {
      parser.dispose();
    }
    for (const pool of start.mock.contexts as StructuredStreamPool<string>[])
      expect(pool.activeIds).toEqual([]);
  });

  it.each([
    '"__proto__":{"polluted":true}',
    '"constructor":{"prototype":{"polluted":true}}',
    '"\\u005f_proto__":{"polluted":true}',
  ])("rejects prototype-bearing arguments before activation: %s", (key) => {
    const parser = new StreamfoldArguments();
    const text = "{" + key + ',"value":"' + "x".repeat(4096);
    try {
      compare(parser.read(0, part(), text), text);
    } finally {
      parser.dispose();
    }
  });

  it("preserves arguments beyond Streamfold's byte limit and frees the failed parser", () => {
    const start = vi.spyOn(StructuredStreamPool.prototype, "start");
    const parser = new StreamfoldArguments();
    const value = "x".repeat(DEFAULT_STREAM_LIMITS.maxBytes);
    const prefix = '{"value":"' + value;
    try {
      expect(parser.read(0, part(), prefix)?.["value"]).toBe(value);
      expect(parser.read(0, part(prefix), 'end"}')?.["value"]).toBe(
        value + "end",
      );
      expect(start).toHaveBeenCalledOnce();
      for (const pool of start.mock.contexts as StructuredStreamPool<string>[])
        expect(pool.activeIds).toEqual([]);
    } finally {
      parser.dispose();
    }
  });
});
