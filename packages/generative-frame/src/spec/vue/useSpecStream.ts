import {
  computed,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
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
  spec: ComputedRef<Spec>;
  text: ComputedRef<string>;
  errors: ComputedRef<SpecStreamError[]>;
  push(chunk: string): void;
  end(): void;
  reset(): void;
};

type Snapshot = { spec: Spec; text: string; errors: SpecStreamError[] };
type Follower = {
  stream: SpecStream;
  consumed: string;
  mode: SpecStreamMode;
  initial: Spec | undefined;
  text: string;
  errors: SpecStreamError[];
};

export function useSpecStream(
  options: UseSpecStreamOptions = {},
): UseSpecStreamResult {
  const snapshot = shallowRef<Snapshot>({
    spec: toValue(options.initial) ?? emptySpec(),
    text: "",
    errors: [],
  });
  const followed = shallowRef<Snapshot>();
  const current = computed(() => followed.value ?? snapshot.value);
  const spec = computed(() => current.value.spec);
  const text = computed(() => current.value.text);
  const errors = computed(() => current.value.errors);
  const start = (mode: SpecStreamMode) => {
    const initial = toValue(options.initial);
    return createSpecStream({ mode, ...(initial ? { initial } : {}) });
  };
  let follower: Follower | undefined;
  let imperative: SpecStream | undefined;

  watch(
    () =>
      [
        toValue(options.source),
        toValue(options.complete),
        toValue(options.mode) ?? "jsonl",
      ] as const,
    ([source, complete, mode]) => {
      if (source === undefined) {
        followed.value = undefined;
        return;
      }
      if (complete) {
        const initial = toValue(options.initial);
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
        follower = undefined;
        followed.value = {
          spec: result.spec,
          text: result.text,
          errors: result.errors,
        };
        return;
      }
      if (
        !follower ||
        follower.mode !== mode ||
        !source.startsWith(follower.consumed)
      ) {
        const initial = toValue(options.initial);
        follower = {
          stream: createSpecStream({ mode, ...(initial ? { initial } : {}) }),
          consumed: "",
          mode,
          initial,
          text: "",
          errors: [],
        };
      }
      if (source.length > follower.consumed.length) {
        const update = follower.stream.push(
          source.slice(follower.consumed.length),
        );
        follower.consumed = source;
        if (update.text) follower.text += update.text;
        if (update.errors.length)
          follower.errors = [...follower.errors, ...update.errors];
      }
      followed.value = {
        spec: follower.stream.spec,
        text: follower.text,
        errors: follower.errors,
      };
    },
    { immediate: true, flush: "sync" },
  );

  return {
    spec,
    text,
    errors,
    push(chunk) {
      imperative ??= start(toValue(options.mode) ?? "jsonl");
      const update = imperative.push(chunk);
      const previous = snapshot.value;
      if (update.spec !== previous.spec || update.text || update.errors.length)
        snapshot.value = {
          spec: update.spec,
          text: previous.text + update.text,
          errors: update.errors.length
            ? [...previous.errors, ...update.errors]
            : previous.errors,
        };
    },
    end() {
      if (!imperative) return;
      const result = imperative.result();
      imperative = undefined;
      snapshot.value = {
        spec: result.spec,
        text: result.text,
        errors: result.errors,
      };
    },
    reset() {
      imperative = undefined;
      follower = undefined;
      snapshot.value = {
        spec: toValue(options.initial) ?? emptySpec(),
        text: "",
        errors: [],
      };
    },
  };
}
