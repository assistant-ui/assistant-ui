import { fromUIMessageLikes } from "../utils/converter/fromUIMessageLike";
import { UIMessage, UIMessageLike } from "./types/message-types";
import { ThreadState } from "./types/thread-types";

type ConverterContext = {
  withScope(scope: string): ConverterContext;
  memoizeTransform<T, R>(value: T, transform: () => R): R;
  memoizeMap<T, R>(
    values: readonly T[],
    map: (value: T, index: number) => R
  ): readonly R[];
  // memoizeGroupBy<T>(
  //   values: readonly T[],
  //   groupBy: (value: T) => string
  // ): readonly { group: string; values: readonly T[] }[];
  fromUIMessageLikes(likes: readonly UIMessageLike[]): readonly UIMessage[];
};

type MemoizationMap<T, R> = Map<T, Record<string, R>>;

class ConverterContextImpl implements ConverterContext {
  private readonly prevMemoizedMap: MemoizationMap<unknown, unknown> =
    new Map();
  private readonly nextMemoizedMap: MemoizationMap<unknown, unknown> =
    new Map();

  constructor(private readonly scope: string = "") {}

  withScope(scope: string): ConverterContext {
    // if (scope.includes(".")) {
    //   throw new Error("Scope cannot contain dots");
    // }

    const newScope = this.scope ? this.scope + "." + scope : scope;
    return new ConverterContextImpl(newScope);
  }

  memoizeTransform<T, R>(value: T, transform: () => R): R {
    const prev = this.prevMemoizedMap.get(value);
    if (prev?.[this.scope]) {
      return prev[this.scope] as R;
    }

    const next = this.nextMemoizedMap.get(value);
    const result = transform();
    this.nextMemoizedMap.set(value, { ...next, [this.scope]: result });
    return result;
  }

  memoizeMap<T, R>(
    values: readonly T[],
    map: (value: T, index: number) => R
  ): readonly R[] {
    return this.memoizeTransform(values, () => {
      return values.map((v, idx): R => {
        const scope = `${this.scope}.${idx}`;
        return this.withScope(scope).memoizeTransform(v, () => {
          return map(v, idx);
        });
      });
    });
  }

  // memoizeGroupBy<T>(
  //   values: readonly T[],
  //   groupBy: (value: T) => string
  // ): readonly { group: string; values: readonly T[] }[] {
  //   return this.memoizeTransform(values, (values) => {
  //     return values.reduce((acc, v) => {
  //       const group = groupBy(v);
  //       acc[group] = acc[group] || [];
  //       acc[group].push(v);
  //       return acc;
  //     }, {} as Record<string, T[]>);
  //   });
  // }

  fromUIMessageLikes(likes: readonly UIMessageLike[]): readonly UIMessage[] {
    return fromUIMessageLikes(likes);
  }
}

type ConverterStoreConverter<TState> = (
  input: { state: TState; metadata: ConnectionMetadata },
  context: ConverterContext
) => Omit<ThreadState, "composer">;

export type ConnectionMetadata = {
  readonly isSending: boolean;
};

export type UIStateConverter<TState> = {
  getStore(): {
    convert: (input: {
      state: TState;
      metadata: ConnectionMetadata;
    }) => Omit<ThreadState, "composer">;
  };
};

export const createConverter = <TState>(
  converter: ConverterStoreConverter<TState>
): UIStateConverter<TState> => {
  return {
    getStore() {
      const context = new ConverterContextImpl();
      return {
        convert: (input: { state: TState; metadata: ConnectionMetadata }) => {
          return converter(input, context);
        },
      };
    },
  };
};
