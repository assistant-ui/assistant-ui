import { useCallback, useMemo, useRef, useState } from "react";
import {
  createSpecStream,
  parseSpecStream,
  type SpecStream,
  type SpecStreamError,
  type SpecStreamMode,
} from "../stream";
import { emptySpec, type Spec } from "../types";

export type UseSpecStreamOptions = {
  /**
   * Model output that is complete or still growing, e.g. a tool call's
   * streamed `patches` argument. When set, the hook follows it: a longer
   * string is parsed incrementally, anything else is parsed from scratch.
   */
  source?: string;
  /** With `source`: the output is complete, so a last line without a newline counts. */
  complete?: boolean;
  mode?: SpecStreamMode;
  /** Spec the patches apply onto. Read when the stream (re)starts. */
  initial?: Spec;
};

export type UseSpecStreamResult = {
  spec: Spec;
  /** Prose outside the patches (inline mode). */
  text: string;
  errors: SpecStreamError[];
  /** Feeds a chunk when the hook is driven imperatively (no `source`). */
  push(chunk: string): void;
  /** Finishes an imperative stream, applying a last line without a newline. */
  end(): void;
  /** Starts over from `initial`. */
  reset(): void;
};

type Snapshot = { spec: Spec; text: string; errors: SpecStreamError[] };

type Follower = {
  stream: SpecStream;
  consumed: string;
  mode: SpecStreamMode;
  text: string;
  errors: SpecStreamError[];
};

/**
 * Builds a spec from streamed JSONL patches, either by following a growing
 * `source` string or through `push`/`end`. The returned spec is a new object
 * only when a patch changed it, so renderers can memoize on it.
 */
export function useSpecStream(
  options: UseSpecStreamOptions = {},
): UseSpecStreamResult {
  const { source, complete = false, mode = "jsonl" } = options;
  const initialRef = useRef(options.initial);
  initialRef.current = options.initial;

  const start = useCallback(
    (): SpecStream =>
      createSpecStream({
        mode,
        ...(initialRef.current ? { initial: initialRef.current } : {}),
      }),
    [mode],
  );

  const follower = useRef<Follower | null>(null);
  const followed = useMemo<Snapshot | null>(() => {
    if (source === undefined) return null;
    if (complete) {
      const result = parseSpecStream(source, {
        mode,
        ...(initialRef.current ? { initial: initialRef.current } : {}),
      });
      follower.current = null;
      return { spec: result.spec, text: result.text, errors: result.errors };
    }
    let current = follower.current;
    if (
      !current ||
      current.mode !== mode ||
      !source.startsWith(current.consumed)
    ) {
      current = { stream: start(), consumed: "", mode, text: "", errors: [] };
      follower.current = current;
    }
    if (source.length > current.consumed.length) {
      const update = current.stream.push(source.slice(current.consumed.length));
      current.consumed = source;
      if (update.text) current.text += update.text;
      if (update.errors.length)
        current.errors = [...current.errors, ...update.errors];
    }
    return {
      spec: current.stream.spec,
      text: current.text,
      errors: current.errors,
    };
  }, [source, complete, mode, start]);

  const imperative = useRef<SpecStream | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    spec: options.initial ?? emptySpec(),
    text: "",
    errors: [],
  }));

  const push = useCallback(
    (chunk: string) => {
      imperative.current ??= start();
      const update = imperative.current.push(chunk);
      setSnapshot((previous) =>
        update.spec === previous.spec &&
        !update.text &&
        update.errors.length === 0
          ? previous
          : {
              spec: update.spec,
              text: previous.text + update.text,
              errors: update.errors.length
                ? [...previous.errors, ...update.errors]
                : previous.errors,
            },
      );
    },
    [start],
  );

  const end = useCallback(() => {
    if (!imperative.current) return;
    const result = imperative.current.result();
    imperative.current = null;
    setSnapshot({
      spec: result.spec,
      text: result.text,
      errors: result.errors,
    });
  }, []);

  const reset = useCallback(() => {
    imperative.current = null;
    follower.current = null;
    setSnapshot({
      spec: initialRef.current ?? emptySpec(),
      text: "",
      errors: [],
    });
  }, []);

  const current = followed ?? snapshot;
  return {
    spec: current.spec,
    text: current.text,
    errors: current.errors,
    push,
    end,
    reset,
  };
}
