import {
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from "vue";
import {
  createSpecStream,
  parseSpecStream,
  type SpecStream,
  type SpecStreamError,
  type SpecStreamMode,
} from "../stream";
import { emptySpec, type Spec } from "../types";

export type UseSpecStreamOptions = {
  source?: MaybeRefOrGetter<string | undefined>;
  complete?: MaybeRefOrGetter<boolean | undefined>;
  mode?: MaybeRefOrGetter<SpecStreamMode | undefined>;
  initial?: MaybeRefOrGetter<Spec | undefined>;
};
export type UseSpecStreamResult = {
  spec: ShallowRef<Spec>;
  text: ShallowRef<string>;
  errors: ShallowRef<SpecStreamError[]>;
  push(chunk: string): void;
  end(): void;
  reset(): void;
};

type Follower = {
  stream: SpecStream;
  consumed: string;
  mode: SpecStreamMode;
  initial: Spec | undefined;
};

export function useSpecStream(
  options: UseSpecStreamOptions = {},
): UseSpecStreamResult {
  const spec = shallowRef<Spec>(toValue(options.initial) ?? emptySpec());
  const text = shallowRef("");
  const errors = shallowRef<SpecStreamError[]>([]);
  const start = (mode: SpecStreamMode, initial: Spec | undefined) =>
    createSpecStream({ mode, ...(initial ? { initial } : {}) });
  let follower: Follower | undefined;
  let imperative: SpecStream | undefined;
  let completed:
    | { source: string; mode: SpecStreamMode; initial: Spec | undefined }
    | undefined;

  watch(
    () =>
      [
        toValue(options.source),
        toValue(options.complete),
        toValue(options.mode) ?? "jsonl",
        toValue(options.initial),
      ] as const,
    ([source, complete, mode, initial]) => {
      if (source === undefined) return;
      if (complete) {
        if (
          completed?.source === source &&
          completed.mode === mode &&
          completed.initial === initial
        )
          return;
        let result;
        if (
          follower &&
          follower.mode === mode &&
          follower.initial === initial &&
          source.startsWith(follower.consumed)
        ) {
          follower.stream.push(source.slice(follower.consumed.length));
          result = follower.stream.result();
        } else {
          result = parseSpecStream(source, {
            mode,
            ...(initial ? { initial } : {}),
          });
        }
        if (result.spec !== spec.value) spec.value = result.spec;
        text.value = result.text;
        errors.value = result.errors;
        completed = { source, mode, initial };
        follower = undefined;
        return;
      }
      completed = undefined;
      if (
        !follower ||
        follower.mode !== mode ||
        follower.initial !== initial ||
        !source.startsWith(follower.consumed)
      ) {
        follower = {
          stream: start(mode, initial),
          consumed: "",
          mode,
          initial,
        };
        spec.value = follower.stream.spec;
        text.value = "";
        errors.value = [];
      }
      if (source.length > follower.consumed.length) {
        const update = follower.stream.push(
          source.slice(follower.consumed.length),
        );
        follower.consumed = source;
        if (update.spec !== spec.value) spec.value = update.spec;
        if (update.text) text.value += update.text;
        if (update.errors.length)
          errors.value = [...errors.value, ...update.errors];
      }
    },
    { immediate: true, flush: "sync" },
  );

  return {
    spec,
    text,
    errors,
    push(chunk) {
      imperative ??= start(
        toValue(options.mode) ?? "jsonl",
        toValue(options.initial),
      );
      const update = imperative.push(chunk);
      if (update.spec !== spec.value) spec.value = update.spec;
      if (update.text) text.value += update.text;
      if (update.errors.length)
        errors.value = [...errors.value, ...update.errors];
    },
    end() {
      if (!imperative) return;
      const result = imperative.result();
      imperative = undefined;
      if (result.spec !== spec.value) spec.value = result.spec;
      text.value = result.text;
      errors.value = result.errors;
    },
    reset() {
      imperative = undefined;
      follower = undefined;
      completed = undefined;
      spec.value = toValue(options.initial) ?? emptySpec();
      text.value = "";
      errors.value = [];
    },
  };
}
