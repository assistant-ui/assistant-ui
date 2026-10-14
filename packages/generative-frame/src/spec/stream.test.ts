// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSpecStream, parseSpecStream } from "./stream";

const LINES = [
  '{"op":"add","path":"/root","value":"main"}',
  '{"op":"add","path":"/elements/main","value":{"type":"Stack","children":["t"]}}',
  '{"op":"add","path":"/elements/t","value":{"type":"Text","props":{"text":"hi"}}}',
];

describe("createSpecStream", () => {
  it.each([null, [], false, 7, "text"])(
    "rejects invalid state %j in whole specs and patches",
    (state) => {
      const initial = parseSpecStream(LINES.join("\n")).spec;
      for (const source of [
        JSON.stringify({ ...initial, state }),
        JSON.stringify({ op: "add", path: "/state", value: state }),
      ]) {
        const result = parseSpecStream(source, { initial });
        expect(result.spec).toBe(initial);
        expect(result.errors).toHaveLength(1);
      }
    },
  );

  it.each([
    null,
    [],
    false,
    7,
    "text",
    { root: "main", elements: null },
    { root: "main", elements: [] },
    { elements: {} },
  ])(
    "rejects an invalid document replacement %j without losing the current spec",
    (value) => {
      const initial = parseSpecStream(LINES.join("\n")).spec;
      const stream = createSpecStream({ initial });
      const update = stream.push(
        JSON.stringify({ op: "replace", path: "", value }) + "\n",
      );
      expect(update.spec).toBe(initial);
      expect(update.errors).toHaveLength(1);
      expect(update.patches).toEqual([]);
      stream.push(
        '{"op":"replace","path":"/elements/t/props/text","value":"repaired"}\n',
      );
      expect(stream.result().spec.elements["t"]?.props?.["text"]).toBe(
        "repaired",
      );
    },
  );

  it.each(["/root", "/elements"])(
    "rejects removing the required %s field",
    (path) => {
      const initial = parseSpecStream(LINES.join("\n")).spec;
      const result = parseSpecStream(JSON.stringify({ op: "remove", path }), {
        initial,
      });
      expect(result.spec).toBe(initial);
      expect(result.errors).toHaveLength(1);
    },
  );

  it.each([null, []])(
    "skips a complete spec with an invalid elements value %j",
    (elements) => {
      const initial = parseSpecStream(LINES.join("\n")).spec;
      const result = parseSpecStream(
        JSON.stringify({ root: "main", elements }),
        { initial },
      );
      expect(result.spec).toBe(initial);
      expect(result.errors).toHaveLength(1);
    },
  );

  it("builds the spec across arbitrary chunk boundaries", () => {
    const source = `${LINES.join("\n")}\n`;
    const stream = createSpecStream();
    const seen: number[] = [];
    for (let i = 0; i < source.length; i += 7) {
      const update = stream.push(source.slice(i, i + 7));
      seen.push(Object.keys(update.spec.elements).length);
    }
    const { spec, patches, errors } = stream.result();
    expect(spec).toEqual({
      root: "main",
      state: {},
      elements: {
        main: { type: "Stack", children: ["t"] },
        t: { type: "Text", props: { text: "hi" } },
      },
    });
    expect(patches).toHaveLength(3);
    expect(errors).toEqual([]);
    expect(seen).toContain(1);
  });

  it("returns the same spec object when a push changes nothing", () => {
    const stream = createSpecStream();
    const first = stream.push(`${LINES[0]}\n`).spec;
    expect(stream.push('{"op":"add"').spec).toBe(first);
  });

  it("processes a trailing line without a newline in result()", () => {
    const { spec } = parseSpecStream(LINES.join("\n"));
    expect(spec.elements["t"]).toBeDefined();
  });

  it("reports bad lines with their line number and keeps going", () => {
    const { spec, errors } = parseSpecStream(
      [
        LINES[0],
        "{not json",
        '{"op":"remove","path":"/elements/nope"}',
        '{"op":"jump","path":"/x"}',
        LINES[1],
      ].join("\n"),
    );
    expect(errors.map((e) => [e.line, e.message])).toEqual([
      [2, "not valid JSON"],
      [3, 'Path segment "nope" does not exist'],
      [4, '"op" must be one of add, replace, remove, move, copy, test'],
    ]);
    expect(spec.elements["main"]).toBeDefined();
  });

  it("accepts a line holding an array of operations or a whole spec", () => {
    const { spec } = parseSpecStream(
      [
        `[${LINES[0]},${LINES[1]}]`,
        '{"root":"x","elements":{"x":{"type":"Text"}}}',
        '{"op":"add","path":"/state/n","value":1}',
      ].join("\n"),
    );
    expect(spec).toEqual({
      root: "x",
      elements: { x: { type: "Text" } },
      state: { n: 1 },
    });
  });

  it("applies patches onto an initial spec", () => {
    const initial = parseSpecStream(LINES.join("\n")).spec;
    const { spec } = parseSpecStream(
      '{"op":"replace","path":"/elements/t/props/text","value":"bye"}',
      { initial },
    );
    expect(spec.elements["t"]?.props).toEqual({ text: "bye" });
    expect(initial.elements["t"]?.props).toEqual({ text: "hi" });
  });

  describe("inline mode", () => {
    it.each([
      "hello\r\nworld",
      "hello\r\n\r\nworld\r\n",
      "hello\r",
      "hello\rworld",
      "hello\r\r\nworld",
      `hello\r\n\`\`\`spec\r\n${LINES[0]}\r\n\`\`\`\r\nworld`,
    ])("preserves inline output at every split in %j", (source) => {
      const expected = parseSpecStream(source, { mode: "inline" });
      for (let split = 0; split <= source.length; split++) {
        const stream = createSpecStream({ mode: "inline" });
        stream.push(source.slice(0, split));
        stream.push(source.slice(split));
        expect(stream.result()).toEqual(expected);
      }
      const stream = createSpecStream({ mode: "inline" });
      for (const character of source) stream.push(character);
      expect(stream.result()).toEqual(expected);
    });

    it("holds a trailing carriage return until the next character arrives", () => {
      const stream = createSpecStream({ mode: "inline" });
      expect(stream.push("hello\r").text).toBe("hello");
      expect(stream.push("").text).toBe("");
      expect(stream.push("\nworld").text).toBe("\nworld");
      expect(stream.result().text).toBe("hello\nworld");
    });

    it("separates prose, fenced patches, and bare patch lines", () => {
      const source = [
        "Here is the dashboard:",
        "```spec",
        LINES[0],
        LINES[1],
        "```",
        "And one more:",
        LINES[2],
        "```js",
        'console.log("{")',
        "```",
        "Done.",
      ].join("\n");
      const { spec, text, errors } = parseSpecStream(source, {
        mode: "inline",
      });
      expect(Object.keys(spec.elements)).toEqual(["main", "t"]);
      expect(text).toBe(
        'Here is the dashboard:\nAnd one more:\n```js\nconsole.log("{")\n```\nDone.',
      );
      expect(errors).toEqual([]);
    });

    it("emits prose before its line ends, but holds back possible patches", () => {
      const stream = createSpecStream({ mode: "inline" });
      expect(stream.push("Hello wor").text).toBe("Hello wor");
      expect(stream.push("ld\n{").text).toBe("ld\n");
      expect(
        stream.push('"op":"add","path":"/root","value":"a"}\nOk').text,
      ).toBe("Ok");
      expect(stream.spec.root).toBe("a");
      expect(stream.result().text).toBe("Hello world\nOk");
    });
  });
});
