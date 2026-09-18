import type { StructuredStreamPool } from "streamfold";
import type { assistantUI } from "streamfold/assistant-ui";
import type { ToolCallPart } from "../../core/utils/types";
import {
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

export const prepareStreamfold = (): Promise<void> => {
  if (
    typeof WebAssembly !== "object" ||
    typeof TextEncoder !== "function" ||
    typeof atob !== "function"
  )
    return Promise.resolve();

  return (loading ??= Promise.all([
    import("streamfold"),
    import("streamfold/assistant-ui"),
  ])
    .then(([core, adapter]) => {
      engine = {
        createPool: core.createStructuredStreamPool,
        createAdapter: adapter.assistantUI,
      };
    })
    .catch(() => undefined));
};

class ArgumentSession {
  private pool: StructuredStreamPool<string> | undefined;
  private adapter: ReturnType<typeof assistantUI> | undefined;
  private offset = 0;
  private fallback = false;
  private observedLength = 0;
  private stringLength = 0;
  private inString = false;
  private escaped = false;
  private useStreamfold = false;
  private readonly toolCallId: string;
  private readonly toolName: string;

  constructor(part: ToolCallPart) {
    this.toolCallId = part.toolCallId;
    this.toolName = part.toolName;
  }

  read(text: string): ReadonlyJSONObject | undefined {
    if (this.fallback || text.length === 0) return parsePartialJsonObject(text);
    if (!this.useStreamfold) {
      if (text.length < MIN_INPUT_LENGTH_TO_SCAN)
        return parsePartialJsonObject(text);
      this.observe(text);
      if (!this.useStreamfold) return parsePartialJsonObject(text);
    }
    if (!engine) {
      void prepareStreamfold();
      return parsePartialJsonObject(text);
    }

    try {
      const delta = text.slice(this.offset);
      // TextEncoder replaces unpaired UTF-16 code units; the legacy parser preserves them.
      if (/[\uD800-\uDFFF]/u.test(delta))
        throw new Error("Unpaired UTF-16 input");
      if (!this.pool) {
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
        textDelta: delta,
      });
      this.offset = text.length;
      if (!update) return parsePartialJsonObject(text);

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
        const parsed = parsePartialJsonObject(text);
        if (parsed === undefined) {
          this.fallback = true;
          this.dispose();
        }
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
      return parsePartialJsonObject(text);
    }
  }

  dispose(): void {
    this.pool?.abort(this.toolCallId);
    this.pool = undefined;
    this.adapter = undefined;
  }

  private observe(text: string): void {
    for (let index = this.observedLength; index < text.length; index++) {
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
        if (this.stringLength >= MIN_STRING_LENGTH_TO_ACCELERATE) {
          this.useStreamfold = true;
          break;
        }
      } else if (character === '"') {
        this.inString = true;
        this.stringLength = 0;
      }
    }
    this.observedLength = text.length;
  }
}

export class StreamfoldArguments {
  private sessions = new Map<number, ArgumentSession>();

  read(index: number, part: ToolCallPart, delta: string) {
    let session = this.sessions.get(index);
    if (!session) {
      session = new ArgumentSession(part);
      this.sessions.set(index, session);
    }
    return session.read(part.argsText + delta);
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
