import type { IncrementalJsonScanner, StreamState } from "streamfold";
import {
  setJsonParserBackend,
  type JsonParserBackend,
} from "../utils/json/json-parser-backend";
import {
  createArgsSnapshot,
  materializeArgsSnapshot,
} from "../utils/json/incremental-json-object-parser";
import type { ReadonlyJSONObject } from "../utils/json/json-value";

type Path = readonly (string | number)[];
type Chunk = { value: string; previous: Chunk | undefined; length: number };
type Session = {
  scanner: IncrementalJsonScanner;
  owner: symbol;
  containers: Path[];
  token: Path | undefined;
  closed: boolean;
};

const samePath = (left: Path, right: Path) =>
  left.length === right.length &&
  left.every((key, index) => key === right[index]);

class StreamfoldParser implements JsonParserBackend {
  private readonly owner = Symbol();

  private readonly session: Session;
  private readonly chunks: Chunk | undefined;
  private readonly args: ReadonlyJSONObject;

  constructor(
    session: Session,
    chunks: Chunk | undefined,
    args: ReadonlyJSONObject,
  ) {
    this.session = session;
    this.chunks = chunks;
    this.args = args;
    session.owner = this.owner;
  }

  get currentTextLength() {
    return this.chunks?.length ?? 0;
  }
  get currentArgs() {
    return this.args;
  }
  get text() {
    const values: string[] = [];
    for (let chunk = this.chunks; chunk; chunk = chunk.previous)
      values.push(chunk.value);
    return values.reverse().join("");
  }

  static create(
    createScanner: () => IncrementalJsonScanner,
    text: string,
    fallback: ReadonlyJSONObject,
  ) {
    const session: Session = {
      scanner: createScanner(),
      owner: Symbol(),
      containers: [],
      token: undefined,
      closed: false,
    };
    const parser = new StreamfoldParser(session, undefined, fallback);
    return text.length ? parser.append(text) : parser;
  }

  append(delta: string): StreamfoldParser | undefined {
    const session = this.session;
    if (session.closed || session.owner !== this.owner) return undefined;
    try {
      // Streamfold omits partial patches for a pending surrogate or minus sign.
      if (/[\uD800-\uDFFF]/u.test(delta))
        throw new Error("Use native partial parsing");
      const update = session.scanner.push(delta);
      if (delta.endsWith("-") && !update.inString)
        throw new Error("Use native partial parsing");
      this.trackPaths(update);
      const root = update.partialValue;
      if (
        root === null ||
        Array.isArray(root) ||
        (root !== undefined && typeof root !== "object")
      )
        throw new Error("Expected object arguments");
      const args =
        root === undefined
          ? this.args
          : materializeArgsSnapshot(
              createArgsSnapshot(
                root as ReadonlyJSONObject,
                update.complete ? "complete" : "partial",
                [...(session.token ?? session.containers.at(-1) ?? [])],
              ),
            );
      const next = new StreamfoldParser(
        session,
        {
          value: delta,
          previous: this.chunks,
          length: this.currentTextLength + delta.length,
        },
        args,
      );
      if (update.complete) this.close();
      return next;
    } catch {
      this.close();
      return undefined;
    }
  }

  private trackPaths(update: StreamState) {
    const session = this.session;
    for (const change of update.changes) {
      if (
        change.path.some(
          (key, index) =>
            key === "__proto__" ||
            (key === "prototype" && change.path[index - 1] === "constructor"),
        )
      )
        throw new Error("Unsafe argument key");
      if (change.op === "complete") {
        if (session.token && samePath(session.token, change.path))
          session.token = undefined;
        if (
          session.containers.at(-1) &&
          samePath(session.containers.at(-1)!, change.path)
        )
          session.containers.pop();
      } else if (change.op === "set") {
        if (change.value !== null && typeof change.value === "object") {
          session.containers.push(change.path);
          session.token = undefined;
        } else {
          session.token =
            typeof change.value === "string" || typeof change.value === "number"
              ? change.path
              : undefined;
        }
      }
    }
  }

  private close() {
    this.session.scanner.dispose();
    this.session.closed = true;
  }
}

/**
 * Prepares Streamfold and enables it for subsequent shared tool-argument parsers
 * in this assistant-stream instance. Existing parsers retain their backend.
 * Returns false when WASM initialization is unavailable; native parsing remains active.
 * Install the optional streamfold peer before importing this entry.
 */
export async function initializeStreamfold(): Promise<boolean> {
  if (typeof FinalizationRegistry !== "function") return false;
  try {
    const { createStructuredStream, prepareStreamfold } =
      await import("streamfold");
    await prepareStreamfold();
    const createScanner = () => createStructuredStream({ snapshots: "live" });
    const probe = createScanner();
    probe.dispose();
    setJsonParserBackend((text, fallback) => {
      if (text.trimEnd().endsWith("}")) return undefined;
      try {
        return StreamfoldParser.create(createScanner, text, fallback);
      } catch {
        return undefined;
      }
    });
    return true;
  } catch {
    return false;
  }
}
