import {
  getPartialJsonObjectMeta,
  parsePartialJsonObject,
} from "./parse-partial-json-object";
import type { ReadonlyJSONObject, ReadonlyJSONValue } from "./json-value";

type JSONPath = (string | number)[];
type JSONScalar = null | string | number | boolean;

const CONTAINER_REF = Symbol("incremental-json-container");
const ARRAY_LENGTH = Symbol("incremental-json-array-length");
const ABSENT = Symbol("incremental-json-absent");

type ContainerRef = {
  readonly [CONTAINER_REF]: true;
  readonly id: number;
  readonly kind: "array" | "object";
};

type StoredValue = JSONScalar | ContainerRef;
type StoredKey = string | number | typeof ARRAY_LENGTH;

type Version = {
  readonly parent: Version | undefined;
  readonly changes: Map<number, Map<StoredKey, StoredValue>>;
  readonly reads: Map<number, Map<StoredKey, StoredValue | typeof ABSENT>>;
  readonly materialized: Map<number, Map<string | number, StoredValue>>;
  readonly views: Map<number, ReadonlyJSONValue>;
};

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

type TextChunk = {
  length: number;
  previous: TextChunk | undefined;
  value: string;
};

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

const isContainerRef = (value: unknown): value is ContainerRef =>
  typeof value === "object" && value !== null && CONTAINER_REF in value;

const toStoredKey = (property: PropertyKey): string | number | symbol => {
  if (typeof property !== "string" || !/^(?:0|[1-9]\d*)$/.test(property)) {
    return property;
  }
  const index = Number(property);
  return Number.isSafeInteger(index) ? index : property;
};

class VersionedJsonStore {
  private nextContainerId = 0;

  createVersion(parent?: Version): Version {
    return {
      parent,
      changes: new Map(),
      reads: new Map(),
      materialized: new Map(),
      views: new Map(),
    };
  }

  createContainer(kind: ContainerRef["kind"], version: Version): ContainerRef {
    const ref = {
      [CONTAINER_REF]: true as const,
      id: this.nextContainerId++,
      kind,
    };
    if (kind === "array") this.write(version, ref, ARRAY_LENGTH, 0);
    return ref;
  }

  read(
    version: Version | undefined,
    ref: ContainerRef,
    key: StoredKey,
  ): StoredValue | typeof ABSENT {
    const traversed: Version[] = [];
    let cursor = version;
    let value: StoredValue | typeof ABSENT = ABSENT;

    while (cursor) {
      if (key !== ARRAY_LENGTH) {
        const materialized = cursor.materialized.get(ref.id);
        if (materialized) {
          value = materialized.has(key as string | number)
            ? materialized.get(key as string | number)!
            : ABSENT;
          break;
        }
      }

      const changes = cursor.changes.get(ref.id);
      if (changes?.has(key)) {
        value = changes.get(key)!;
        break;
      }

      const reads = cursor.reads.get(ref.id);
      if (reads?.has(key)) {
        value = reads.get(key)!;
        break;
      }

      traversed.push(cursor);
      cursor = cursor.parent;
    }

    for (const traversedVersion of traversed) {
      let reads = traversedVersion.reads.get(ref.id);
      if (!reads) {
        reads = new Map();
        traversedVersion.reads.set(ref.id, reads);
      }
      reads.set(key, value);
    }
    return value;
  }

  write(
    version: Version,
    ref: ContainerRef,
    key: StoredKey,
    value: StoredValue,
  ) {
    let changes = version.changes.get(ref.id);
    if (!changes) {
      changes = new Map();
      version.changes.set(ref.id, changes);
    }
    changes.set(key, value);
    version.reads.get(ref.id)?.delete(key);

    if (ref.kind === "array" && typeof key === "number") {
      const length = this.read(version, ref, ARRAY_LENGTH);
      const nextLength = Math.max(
        length === ABSENT ? 0 : Number(length),
        key + 1,
      );
      changes.set(ARRAY_LENGTH, nextLength);
      version.reads.get(ref.id)?.delete(ARRAY_LENGTH);
    }
  }

  view(
    version: Version,
    ref: ContainerRef,
    meta?: { state: "complete" | "partial"; partialPath: string[] },
  ): ReadonlyJSONValue {
    const cached = version.views.get(ref.id);
    if (cached) return cached;

    if (ref.kind === "array") {
      const length = this.read(version, ref, ARRAY_LENGTH);
      const target: ReadonlyJSONValue[] = [];
      target.length = length === ABSENT ? 0 : Number(length);
      const proxy = new Proxy(
        target,
        this.proxyHandler(version, ref),
      ) as ReadonlyJSONValue[];
      version.views.set(ref.id, proxy);
      return proxy;
    }

    const target = meta
      ? (parsePartialJsonObject("")! as Record<PropertyKey, unknown>)
      : {};
    if (meta) Object.assign(getPartialJsonObjectMeta(target)!, meta);
    const proxy = new Proxy(
      target,
      this.proxyHandler(version, ref),
    ) as ReadonlyJSONObject;
    version.views.set(ref.id, proxy as ReadonlyJSONObject);
    return proxy as ReadonlyJSONObject;
  }

  private expose(version: Version, value: StoredValue): ReadonlyJSONValue {
    return isContainerRef(value) ? this.view(version, value) : value;
  }

  private materialize(
    version: Version,
    ref: ContainerRef,
  ): Map<string | number, StoredValue> {
    const cached = version.materialized.get(ref.id);
    if (cached) return cached;

    const versions: Version[] = [];
    let cursor: Version | undefined = version;
    let values = new Map<string | number, StoredValue>();

    while (cursor) {
      const materialized = cursor.materialized.get(ref.id);
      if (materialized) {
        values = new Map(materialized);
        break;
      }
      versions.push(cursor);
      cursor = cursor.parent;
    }

    for (let index = versions.length - 1; index >= 0; index--) {
      const changes = versions[index]!.changes.get(ref.id);
      if (changes) {
        for (const [key, value] of changes) {
          if (key !== ARRAY_LENGTH) {
            values.set(key, value as StoredValue);
          }
        }
      }
    }
    version.materialized.set(ref.id, values);
    return values;
  }

  private proxyHandler(
    version: Version,
    ref: ContainerRef,
  ): ProxyHandler<object> {
    return {
      get: (target, property, receiver) => {
        const key = toStoredKey(property);
        if (typeof key === "string" || typeof key === "number") {
          if (ref.kind === "array" && typeof key === "number") {
            this.materialize(version, ref);
          }
          const value = this.read(version, ref, key);
          if (value !== ABSENT)
            return this.expose(version, value as StoredValue);
        }
        return Reflect.get(target, property, receiver);
      },
      getOwnPropertyDescriptor: (target, property) => {
        const key = toStoredKey(property);
        if (typeof key === "string" || typeof key === "number") {
          const value = this.read(version, ref, key);
          if (value !== ABSENT) {
            return {
              configurable: true,
              enumerable: true,
              value: this.expose(version, value as StoredValue),
              writable: true,
            };
          }
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      has: (target, property) => {
        const key = toStoredKey(property);
        if (
          (typeof key === "string" || typeof key === "number") &&
          this.read(version, ref, key) !== ABSENT
        ) {
          return true;
        }
        return Reflect.has(target, property);
      },
      ownKeys: (target) => {
        const keys = [...this.materialize(version, ref).keys()].map(String);
        for (const key of Reflect.ownKeys(target)) {
          if (!keys.includes(key as string)) keys.push(key as string);
        }
        return keys;
      },
    };
  }
}

const writeAtPath = (
  store: VersionedJsonStore,
  version: Version,
  root: ContainerRef,
  path: JSONPath,
  value: StoredValue,
) => {
  let container = root;
  for (let depth = 0; depth < path.length - 1; depth++) {
    const child = store.read(version, container, path[depth]!);
    if (!isContainerRef(child)) {
      throw new Error("Invalid incremental JSON path");
    }
    container = child;
  }
  store.write(version, container, path.at(-1)!, value);
};

export class IncrementalJsonObjectParser {
  private readonly store: VersionedJsonStore;
  private readonly root: ContainerRef;
  private readonly version: Version;
  private text: TextChunk | undefined;
  private mode: "start" | "parsing" | "complete" | "fallback" = "start";
  private frames: Frame[] = [];
  private token: Token | undefined;
  private args: ReadonlyJSONObject;

  private constructor(
    fallback: ReadonlyJSONObject,
    store = new VersionedJsonStore(),
    root?: ContainerRef,
    version?: Version,
  ) {
    this.args = fallback;
    this.store = store;
    this.version = version ?? store.createVersion();
    this.root = root ?? store.createContainer("object", this.version);
  }

  static from(
    text = "",
    fallback: ReadonlyJSONObject = parsePartialJsonObject("")!,
  ) {
    const parser = new IncrementalJsonObjectParser(fallback);
    parser.consumeDelta(text);
    if (text.length !== 0) {
      parser.text = { length: text.length, previous: undefined, value: text };
    }
    parser.args = parser.snapshot(fallback);
    return parser;
  }

  get currentTextLength() {
    return this.text?.length ?? 0;
  }

  get currentArgs() {
    return this.args;
  }

  append(delta: string) {
    if (delta.length === 0) return this;

    const parser = this.clone();
    const fallback = this.args;
    parser.consumeDelta(delta);
    parser.text = {
      length: (this.text?.length ?? 0) + delta.length,
      previous: this.text,
      value: delta,
    };
    parser.args = parser.snapshot(fallback);
    return parser;
  }

  private clone() {
    const parser = new IncrementalJsonObjectParser(
      this.args,
      this.store,
      this.root,
      this.store.createVersion(this.version),
    );
    parser.text = this.text;
    parser.mode = this.mode;
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
      return parsePartialJsonObject(this.accumulatedText()) ?? fallback;
    }

    if (this.mode === "start") return fallback;

    return this.store.view(this.version, this.root, {
      state: this.mode === "complete" ? "complete" : "partial",
      partialPath: this.partialPath().map(String),
    }) as ReadonlyJSONObject;
  }

  private accumulatedText() {
    const chunks: string[] = [];
    for (let chunk = this.text; chunk; chunk = chunk.previous) {
      chunks.push(chunk.value);
    }
    return chunks.reverse().join("");
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

  private isFallback() {
    return this.mode === "fallback";
  }

  private consumeDelta(delta: string) {
    if (this.isFallback()) return;

    for (const char of delta) {
      this.consumeCharacter(char);
      if (this.isFallback()) break;
    }

    if (
      !this.isFallback() &&
      this.token?.kind === "string" &&
      this.token.role === "value"
    ) {
      this.writeValue(this.token.path, this.token.value);
    } else if (
      !this.isFallback() &&
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
      this.writeValue(path, this.store.createContainer("object", this.version));
      this.frames.push({
        kind: "object",
        path,
        state: "first-key-or-end",
      });
    } else if (char === "[") {
      this.writeValue(path, this.store.createContainer("array", this.version));
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

  private writeValue(path: JSONPath, value: StoredValue) {
    try {
      writeAtPath(this.store, this.version, this.root, path, value);
    } catch {
      this.mode = "fallback";
    }
  }
}
