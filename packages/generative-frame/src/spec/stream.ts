import { applyPatchOperation, checkPatchOperation } from "./patch";
import { emptySpec, type PatchOperation, type Spec } from "./types";

/**
 * `jsonl`: every non-empty line is a patch operation (what `render_spec`
 * receives). `inline`: prose and patches interleave, as in a chat reply;
 * patch lines sit in a ```spec fence or start with `{"op"`, everything else
 * is text.
 */
export type SpecStreamMode = "jsonl" | "inline";

export type SpecStreamError = { line: number; message: string; text: string };

export type SpecStreamUpdate = {
  /** The spec after every patch so far. A new object only when it changed. */
  spec: Spec;
  /** Operations applied by this push. */
  patches: PatchOperation[];
  /** Prose added by this push (inline mode). */
  text: string;
  /** Errors from lines completed by this push. */
  errors: SpecStreamError[];
};

export type SpecStreamResult = {
  spec: Spec;
  patches: PatchOperation[];
  text: string;
  errors: SpecStreamError[];
};

export type SpecStream = {
  /** Feeds raw model output; partial lines wait for their newline. */
  push(chunk: string): SpecStreamUpdate;
  /** Processes a trailing line without a newline and returns everything so far. */
  result(): SpecStreamResult;
  readonly spec: Spec;
};

export type CreateSpecStreamOptions = {
  mode?: SpecStreamMode;
  /** Spec to apply patches onto. Defaults to an empty spec. */
  initial?: Spec;
};

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w-]*)\s*$/;
const SPEC_FENCES = new Set(["spec", "jsonl", "json-patch", "spec-jsonl"]);
const LOOKS_LIKE_PATCH = /^\s*\{\s*"op"\s*:/;
/** A partial line that can no longer turn into a patch or a fence. */
const PROSE_START = /^\s*[^\s{`~]/;

const isSpecShape = (value: unknown): value is Spec =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Spec).root === "string" &&
  typeof (value as Spec).elements === "object";

/**
 * Turns a stream of JSONL patch lines (optionally interleaved with prose)
 * into a progressively built spec. Bad lines are reported and skipped, so
 * one malformed patch does not stop the rest of the UI from rendering.
 */
export function createSpecStream(
  options: CreateSpecStreamOptions = {},
): SpecStream {
  const mode = options.mode ?? "jsonl";
  let spec: Spec = options.initial ?? emptySpec();
  let buffer = "";
  let lineNumber = 0;
  let fence: string | undefined;
  let fenceIsSpec = false;
  let finished = false;
  /** Characters of the current, unfinished line already emitted as prose. */
  let proseEmitted = 0;
  const allPatches: PatchOperation[] = [];
  const allErrors: SpecStreamError[] = [];
  let allText = "";

  const applyLine = (
    raw: string,
    update: {
      patches: PatchOperation[];
      text: string;
      errors: SpecStreamError[];
    },
    terminated: boolean,
  ) => {
    lineNumber++;
    const line = raw.replace(/\r$/, "");
    const emitted = proseEmitted;
    proseEmitted = 0;
    const prose = () => {
      const text = (terminated ? `${line}\n` : line).slice(emitted);
      update.text += text;
      allText += text;
    };

    if (mode === "inline") {
      const fenceMatch = FENCE.exec(line);
      if (fenceMatch) {
        if (fence === undefined) {
          fence = fenceMatch[1]!;
          fenceIsSpec = SPEC_FENCES.has(fenceMatch[2]!.toLowerCase());
          if (!fenceIsSpec) prose();
          return;
        }
        if (fenceMatch[1]!.startsWith(fence) && !fenceMatch[2]) {
          if (!fenceIsSpec) prose();
          fence = undefined;
          fenceIsSpec = false;
          return;
        }
      }
      const isPatchLine =
        (fence !== undefined && fenceIsSpec) ||
        (fence === undefined && LOOKS_LIKE_PATCH.test(line));
      if (!isPatchLine) {
        prose();
        return;
      }
    }

    const trimmed = line.trim();
    if (!trimmed) return;
    const fail = (message: string) => {
      const error = { line: lineNumber, message, text: trimmed.slice(0, 200) };
      update.errors.push(error);
      allErrors.push(error);
    };

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      fail("not valid JSON");
      return;
    }

    if (isSpecShape(parsed)) {
      spec = { state: {}, ...parsed };
      return;
    }
    const operations = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of operations) {
      const checked = checkPatchOperation(candidate);
      if (!checked.ok) {
        fail(checked.error);
        continue;
      }
      try {
        spec = applyPatchOperation(spec, checked.op, { createMissing: true });
        update.patches.push(checked.op);
        allPatches.push(checked.op);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    }
  };

  const push = (chunk: string): SpecStreamUpdate => {
    if (finished) throw new Error("The spec stream already finished");
    const update = { patches: [], text: "", errors: [] } as Omit<
      SpecStreamUpdate,
      "spec"
    >;
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      applyLine(line, update, true);
      newline = buffer.indexOf("\n");
    }
    if (
      mode === "inline" &&
      fence === undefined &&
      buffer.length > proseEmitted &&
      PROSE_START.test(buffer)
    ) {
      const text = buffer.slice(proseEmitted);
      proseEmitted = buffer.length;
      update.text += text;
      allText += text;
    }
    return { spec, ...update };
  };

  return {
    push,
    result() {
      if (!finished && buffer) {
        const rest = buffer;
        buffer = "";
        applyLine(rest, { patches: [], text: "", errors: [] }, false);
      }
      finished = true;
      return {
        spec,
        patches: [...allPatches],
        text: allText,
        errors: [...allErrors],
      };
    },
    get spec() {
      return spec;
    },
  };
}

/** Parses complete JSONL or inline output in one go. */
export function parseSpecStream(
  source: string,
  options: CreateSpecStreamOptions = {},
): SpecStreamResult {
  const stream = createSpecStream(options);
  stream.push(source);
  return stream.result();
}
