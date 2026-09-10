import {
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";
import type { ReadonlyJSONObject, ReadonlyJSONValue } from "./json-value";

type JSONPath = (string | number)[];
type MutableJSONObject = Record<string, ReadonlyJSONValue>;
type MutableJSONContainer = MutableJSONObject | ReadonlyJSONValue[];

type ObjectFrame = {
  kind: "object";
  path: JSONPath;
  state: "first-key-or-end" | "key" | "colon" | "value" | "comma-or-end";
  key?: string | undefined;
};

type ArrayFrame = {
  kind: "array";
  path: JSONPath;
  state: "first-value-or-end" | "value" | "comma-or-end";
  index: number;
};

type Frame = ObjectFrame | ArrayFrame;

type StringToken =
  | {
      kind: "string";
      role: "key";
      value: string;
      escape: "none" | "single" | "unicode";
      unicode: string;
    }
  | {
      kind: "string";
      role: "value";
      path: JSONPath;
      value: string;
      escape: "none" | "single" | "unicode";
      unicode: string;
    };

type NumberToken = {
  kind: "number";
  path: JSONPath;
  value: string;
};

type LiteralToken = {
  kind: "literal";
  value: "true" | "false" | "null";
  offset: number;
};

type Token = StringToken | NumberToken | LiteralToken;

const COMPLETE_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const PARTIAL_NUMBER =
  /^-?$|^-?(?:0|[1-9]\d*)(?:\.\d*)?$|^-?(?:0|[1-9]\d*)(?:\.\d+)?[eE][+-]?\d*$/;
const JSON_WHITESPACE = /^[\t\n\r ]$/;
const HEX_DIGIT = /^[0-9a-fA-F]$/;
const SINGLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

const isContainer = (value: unknown): value is MutableJSONContainer =>
  typeof value === "object" && value !== null;

const setValue = (
  target: MutableJSONContainer,
  key: string | number,
  value: ReadonlyJSONValue,
) => {
  (target as Record<string | number, ReadonlyJSONValue>)[key] = value;
};

const writeAtPath = (
  root: MutableJSONObject,
  path: JSONPath,
  value: ReadonlyJSONValue,
): MutableJSONObject => {
  const update = (
    container: MutableJSONContainer,
    depth: number,
  ): MutableJSONContainer => {
    const clone: MutableJSONContainer = Array.isArray(container)
      ? [...container]
      : { ...container };
    const key = path[depth]!;

    if (depth === path.length - 1) {
      setValue(clone, key, value);
      return clone;
    }

    const child = container[key as keyof typeof container];
    if (!isContainer(child)) throw new Error("Invalid incremental JSON path");
    setValue(clone, key, update(child, depth + 1));
    return clone;
  };

  return update(root, 0) as MutableJSONObject;
};

const createArgsSnapshot = (
  root: MutableJSONObject,
  state: "complete" | "partial",
  partialPath: JSONPath,
): ReadonlyJSONObject => {
  const result = parsePartialJsonObject("")! as MutableJSONObject;
  for (const [key, value] of Object.entries(root)) {
    setValue(result, key, value);
  }

  const meta = getPartialJsonObjectMeta(result)!;
  meta.state = state;
  meta.partialPath = partialPath.map(String);
  return result;
};

/** Incrementally parses an append-only JSON object with partial-field metadata. */
export class IncrementalPartialJsonObjectParser {
  private text = "";
  private mode: "start" | "parsing" | "complete" | "fallback" = "start";
  private root: MutableJSONObject = {};
  private frames: Frame[] = [];
  private token: Token | undefined;
  private args: ReadonlyJSONObject;

  private constructor(fallback: ReadonlyJSONObject) {
    this.args = fallback;
  }

  static from(text: string, fallback?: ReadonlyJSONObject) {
    // Non-empty unparseable prefixes historically retain a plain object.
    fallback ??= text.length === 0 ? parsePartialJsonObject("")! : {};
    const parser = new IncrementalPartialJsonObjectParser(fallback);
    parser.consumeDelta(text);
    parser.text = text;
    parser.args = parser.snapshot(fallback);
    return parser;
  }

  get currentText() {
    return this.text;
  }

  get currentArgs() {
    return this.args;
  }

  append(delta: string, fullText = this.text + delta) {
    if (delta.length === 0) return this;

    const parser = this.clone();
    const fallback = this.args;
    parser.consumeDelta(delta);
    parser.text = fullText;
    parser.args = parser.snapshot(fallback);
    return parser;
  }

  private clone() {
    const parser = new IncrementalPartialJsonObjectParser(this.args);
    parser.text = this.text;
    parser.mode = this.mode;
    parser.root = this.root;
    parser.frames = this.frames.map((frame) => ({
      ...frame,
      path: [...frame.path],
    }));
    parser.token = this.token
      ? {
          ...this.token,
          ...("path" in this.token && this.token.path
            ? { path: [...this.token.path] }
            : undefined),
        }
      : undefined;
    return parser;
  }

  private snapshot(fallback: ReadonlyJSONObject) {
    if (this.mode === "fallback") {
      return parsePartialJsonObject(this.text) ?? fallback;
    }

    if (this.mode === "start") return fallback;

    return createArgsSnapshot(
      this.root,
      this.mode === "complete" ? "complete" : "partial",
      this.partialPath(),
    );
  }

  private partialPath(): JSONPath {
    if (this.mode === "complete") return [];
    if (
      this.token &&
      (this.token.kind === "number" ||
        (this.token.kind === "string" && this.token.role === "value"))
    ) {
      return this.token.path;
    }
    return this.frames.at(-1)?.path ?? [];
  }

  private isInFallbackMode() {
    return this.mode === "fallback";
  }

  private consumeDelta(delta: string) {
    if (this.isInFallbackMode()) return;

    for (const char of delta) {
      this.consumeCharacter(char);
      if (this.isInFallbackMode()) return;
    }

    if (this.token?.kind === "string" && this.token.role === "value") {
      this.writeValue(this.token.path, this.token.value);
    } else if (
      this.token?.kind === "number" &&
      COMPLETE_NUMBER.test(this.token.value)
    ) {
      this.writeValue(this.token.path, Number(this.token.value));
    }
  }

  private consumeCharacter(char: string) {
    let reconsume = true;
    while (reconsume && this.mode !== "fallback") {
      reconsume = false;

      if (this.token) {
        reconsume = this.consumeToken(char);
        continue;
      }

      if (this.mode === "complete") {
        if (!JSON_WHITESPACE.test(char)) this.mode = "fallback";
        continue;
      }

      if (this.mode === "start") {
        if (JSON_WHITESPACE.test(char)) continue;
        if (char !== "{") {
          this.mode = "fallback";
          continue;
        }
        this.mode = "parsing";
        this.frames.push({
          kind: "object",
          path: [],
          state: "first-key-or-end",
        });
        continue;
      }

      const frame = this.frames.at(-1);
      if (!frame) {
        this.mode = "fallback";
        continue;
      }

      if (frame.kind === "object") {
        this.consumeObjectCharacter(frame, char);
      } else {
        this.consumeArrayCharacter(frame, char);
      }
    }
  }

  private consumeObjectCharacter(frame: ObjectFrame, char: string) {
    if (JSON_WHITESPACE.test(char)) return;

    switch (frame.state) {
      case "first-key-or-end":
        if (char === "}") this.closeContainer();
        else if (char === '"') {
          frame.state = "key";
          this.startKeyString();
        } else this.mode = "fallback";
        break;
      case "key":
        if (char === '"') this.startKeyString();
        else this.mode = "fallback";
        break;
      case "colon":
        if (char === ":") frame.state = "value";
        else this.mode = "fallback";
        break;
      case "value":
        this.startValue(char, [...frame.path, frame.key!]);
        break;
      case "comma-or-end":
        if (char === ",") {
          frame.state = "key";
          frame.key = undefined;
        } else if (char === "}") this.closeContainer();
        else this.mode = "fallback";
        break;
    }
  }

  private consumeArrayCharacter(frame: ArrayFrame, char: string) {
    if (JSON_WHITESPACE.test(char)) return;

    switch (frame.state) {
      case "first-value-or-end":
        if (char === "]") this.closeContainer();
        else {
          frame.state = "value";
          this.startValue(char, [...frame.path, frame.index]);
        }
        break;
      case "value":
        this.startValue(char, [...frame.path, frame.index]);
        break;
      case "comma-or-end":
        if (char === ",") {
          frame.index += 1;
          frame.state = "value";
        } else if (char === "]") this.closeContainer();
        else this.mode = "fallback";
        break;
    }
  }

  private startValue(char: string, path: JSONPath) {
    if (char === "{") {
      this.writeValue(path, {});
      this.frames.push({
        kind: "object",
        path,
        state: "first-key-or-end",
      });
    } else if (char === "[") {
      this.writeValue(path, []);
      this.frames.push({
        kind: "array",
        path,
        state: "first-value-or-end",
        index: 0,
      });
    } else if (char === '"') {
      this.writeValue(path, "");
      this.startValueString(path);
    } else if (char === "t" || char === "f" || char === "n") {
      const value = char === "t" ? "true" : char === "f" ? "false" : "null";
      this.writeValue(
        path,
        value === "true" ? true : value === "false" ? false : null,
      );
      this.token = { kind: "literal", value, offset: 1 };
    } else if (char === "-" || (char >= "0" && char <= "9")) {
      this.token = { kind: "number", path, value: char };
      if (COMPLETE_NUMBER.test(char)) this.writeValue(path, Number(char));
    } else {
      this.mode = "fallback";
    }
  }

  private startKeyString() {
    this.token = {
      kind: "string",
      role: "key",
      value: "",
      escape: "none",
      unicode: "",
    };
  }

  private startValueString(path: JSONPath) {
    this.token = {
      kind: "string",
      role: "value",
      path,
      value: "",
      escape: "none",
      unicode: "",
    };
  }

  private consumeToken(char: string): boolean {
    const token = this.token!;
    if (token.kind === "string") return this.consumeString(token, char);
    if (token.kind === "number") return this.consumeNumber(token, char);
    return this.consumeLiteral(token, char);
  }

  private consumeString(token: StringToken, char: string): boolean {
    if (token.escape === "unicode") {
      if (!HEX_DIGIT.test(char)) {
        this.mode = "fallback";
        return false;
      }
      token.unicode += char;
      if (token.unicode.length === 4) {
        token.value += String.fromCharCode(Number.parseInt(token.unicode, 16));
        token.escape = "none";
        token.unicode = "";
      }
      return false;
    }

    if (token.escape === "single") {
      if (char === "u") {
        token.escape = "unicode";
        return false;
      }
      const decoded = SINGLE_ESCAPES[char];
      if (decoded === undefined) this.mode = "fallback";
      else {
        token.value += decoded;
        token.escape = "none";
      }
      return false;
    }

    if (char === "\\") {
      token.escape = "single";
      return false;
    }
    if (char.charCodeAt(0) < 0x20) {
      this.mode = "fallback";
      return false;
    }
    if (char !== '"') {
      token.value += char;
      return false;
    }

    this.token = undefined;
    if (token.role === "key") {
      const frame = this.frames.at(-1);
      if (!frame || frame.kind !== "object") {
        this.mode = "fallback";
        return false;
      }
      if (
        token.value === "__proto__" ||
        (token.value === "prototype" && frame.path.at(-1) === "constructor")
      ) {
        this.mode = "fallback";
        return false;
      }
      frame.key = token.value;
      frame.state = "colon";
    } else {
      this.writeValue(token.path, token.value);
      this.finishValue();
    }
    return false;
  }

  private consumeNumber(token: NumberToken, char: string): boolean {
    if (
      (char >= "0" && char <= "9") ||
      char === "e" ||
      char === "E" ||
      char === "+" ||
      char === "-" ||
      char === "."
    ) {
      const value = token.value + char;
      if (!PARTIAL_NUMBER.test(value)) {
        this.mode = "fallback";
        return false;
      }
      token.value = value;
      if (COMPLETE_NUMBER.test(token.value)) {
        this.writeValue(token.path, Number(token.value));
      }
      return false;
    }

    if (!COMPLETE_NUMBER.test(token.value)) {
      this.mode = "fallback";
      return false;
    }
    this.token = undefined;
    this.finishValue();
    return true;
  }

  private consumeLiteral(token: LiteralToken, char: string): boolean {
    if (char !== token.value[token.offset]) {
      this.mode = "fallback";
      return false;
    }
    token.offset += 1;
    if (token.offset === token.value.length) {
      this.token = undefined;
      this.finishValue();
    }
    return false;
  }

  private finishValue() {
    const frame = this.frames.at(-1);
    if (!frame || frame.state !== "value") {
      this.mode = "fallback";
      return;
    }
    frame.state = "comma-or-end";
  }

  private closeContainer() {
    this.frames.pop();
    if (this.frames.length === 0) {
      this.mode = "complete";
    } else {
      this.finishValue();
    }
  }

  private writeValue(path: JSONPath, value: ReadonlyJSONValue) {
    try {
      this.root = writeAtPath(this.root, path, value);
    } catch {
      this.mode = "fallback";
    }
  }
}
