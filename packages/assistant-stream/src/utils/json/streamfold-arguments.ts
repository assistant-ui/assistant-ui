import type { StructuredStreamPool } from "streamfold";
import type { assistantUI } from "streamfold/assistant-ui";
import type { ToolCallPart } from "../../core/utils/types";
import {
  parseIncompleteJsonObject,
  parsePartialJsonObject,
  withPartialJsonObjectMeta,
} from "./parse-partial-json-object";
import type { ReadonlyJSONObject } from "./json-value";

type Engine = {
  createPool: typeof import("streamfold").createStructuredStreamPool;
  createAdapter: typeof assistantUI;
};

const MIN_INPUT_LENGTH_TO_SCAN = 2 * 1024;
const MIN_STRING_LENGTH_TO_ACCELERATE = 4 * 1024;

let engine: Engine | undefined;
let loading: Promise<void> | undefined;
let disabled = false;

export const prepareStreamfold = (): Promise<void> => {
  if (disabled) return (loading ??= Promise.resolve());
  if (
    typeof WebAssembly !== "object" ||
    typeof TextEncoder !== "function" ||
    typeof atob !== "function"
  ) {
    disabled = true;
    return (loading ??= Promise.resolve());
  }

  return (loading ??= Promise.all([
    import("streamfold"),
    import("streamfold/assistant-ui"),
  ])
    .then(async ([core, adapter]) => {
      if (
        "prepareStreamfold" in core &&
        typeof core.prepareStreamfold === "function"
      )
        await core.prepareStreamfold();
      engine = {
        createPool: core.createStructuredStreamPool,
        createAdapter: adapter.assistantUI,
      };
    })
    .catch(() => {
      disabled = true;
    }));
};

class ArgumentSession {
  private pool: StructuredStreamPool<string> | undefined;
  private adapter: ReturnType<typeof assistantUI> | undefined;
  private fallback = false;
  private preparing = false;
  private stringLength = 0;
  private inString = false;
  private escaped = false;
  private readonly toolCallId: string;
  private readonly toolName: string;

  constructor(part: ToolCallPart) {
    this.toolCallId = part.toolCallId;
    this.toolName = part.toolName;
    this.observe(part.argsText);
  }

  read(text: string, delta: string): ReadonlyJSONObject | undefined {
    if (this.fallback || text.length === 0) return parsePartialJsonObject(text);
    if (text.length < MIN_INPUT_LENGTH_TO_SCAN)
      return parsePartialJsonObject(text);
    this.observe(delta);
    // An open string cannot be complete JSON, so skip the parse that must throw.
    const parse = this.inString
      ? parseIncompleteJsonObject
      : parsePartialJsonObject;
    if (!this.inString || this.stringLength < MIN_STRING_LENGTH_TO_ACCELERATE) {
      this.releaseParser();
      return parse(text);
    }
    if (!engine) {
      if (disabled) this.fallback = true;
      else if (!this.preparing) {
        this.preparing = true;
        void prepareStreamfold();
      }
      return parse(text);
    }

    try {
      const seeded = this.pool === undefined;
      const chunk = seeded ? text : delta;
      // TextEncoder replaces unpaired UTF-16 code units; the legacy parser preserves them.
      if (/[\uD800-\uDFFF]/u.test(chunk))
        throw new Error("Unpaired UTF-16 input");
      if (seeded) {
        this.pool = engine.createPool({ snapshots: "immutable" });
        this.adapter = engine.createAdapter(this.pool);
        this.adapter.push({
          type: "part-start",
          path: [0],
          part: {
            type: "tool-call",
            toolCallId: this.toolCallId,
            toolName: this.toolName,
          },
        });
      }
      const update = this.adapter!.push({
        type: "text-delta",
        path: [0],
        textDelta: chunk,
      });
      if (!update) return parse(text);

      for (const change of update.changes) {
        // Keep secure-json-parse's rejection policy, including escaped key names.
        if (
          change.path.some(
            (key, index, path) =>
              key === "__proto__" ||
              (key === "prototype" && path[index - 1] === "constructor"),
          )
        )
          throw new Error("Prototype-bearing arguments");
      }

      // JSON repair exposes speculative numbers/literals that Streamfold need not emit.
      if (
        !update.inString ||
        update.changes.length === 0 ||
        update.changes.some((change) => change.op !== "append")
      ) {
        const parsed = parse(text);
        // The first push seeds the scanner with the full prefix and normally
        // reports `set` changes. Keep that state so later deltas can append;
        // a structural change from an already-active scanner must be released.
        if (!seeded || !update.inString || update.changes.length === 0)
          this.releaseParser();
        if (parsed === undefined) this.fallback = true;
        return parsed;
      }

      const value = update.partialValue;
      if (value === null || typeof value !== "object") return undefined;
      return withPartialJsonObjectMeta(value as ReadonlyJSONObject, {
        state: update.complete ? "complete" : "partial",
        partialPath: update.changes.at(-1)!.path.map(String),
      });
    } catch {
      this.fallback = true;
      this.dispose();
      return parse(text);
    }
  }

  dispose(): void {
    this.fallback = true;
    this.releaseParser();
  }

  private releaseParser(): void {
    this.pool?.abort(this.toolCallId);
    this.pool = undefined;
    this.adapter = undefined;
  }

  private observe(text: string): void {
    // Indexing a growing concatenated string can flatten its entire prefix.
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (this.inString) {
        if (this.escaped) {
          this.escaped = false;
          this.stringLength++;
        } else if (character === "\\") {
          this.escaped = true;
          this.stringLength++;
        } else if (character === '"') {
          this.inString = false;
          this.stringLength = 0;
        } else {
          this.stringLength++;
        }
      } else if (character === '"') {
        this.inString = true;
        this.stringLength = 0;
      }
    }
  }
}

export class StreamfoldArguments {
  private sessions = new Map<number, ArgumentSession>();

  read(
    index: number,
    part: ToolCallPart,
    delta: string,
    text = part.argsText + delta,
  ) {
    let session = this.sessions.get(index);
    if (!session) {
      if (text.length < MIN_INPUT_LENGTH_TO_SCAN)
        return parsePartialJsonObject(text);
      const lastCharacter = text.trimEnd().at(-1);
      if (lastCharacter === "}" || lastCharacter === "]")
        return parsePartialJsonObject(text);
      session = new ArgumentSession(part);
      this.sessions.set(index, session);
    }
    return session.read(text, delta);
  }

  release(index: number): void {
    this.sessions.get(index)?.dispose();
    this.sessions.delete(index);
  }

  dispose(): void {
    for (const session of this.sessions.values()) session.dispose();
    this.sessions.clear();
  }
}
