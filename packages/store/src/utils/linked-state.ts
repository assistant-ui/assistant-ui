import { useMemo, useRef } from "react";
import {
  shallowEqualArray,
  shallowEqualObject,
  useShallowStable,
} from "./shallow-stable";

let selectorDepth = 0;

export const runInStateSelector = <T>(fn: () => T): T => {
  selectorDepth++;
  try {
    return fn();
  } finally {
    selectorDepth--;
  }
};

export type LinkedStateResolvers<TLinked extends object> = {
  readonly [K in keyof TLinked]: () => TLinked[K];
};

export const createLinkedStateProto = <TLinked extends object>(
  scope: string,
  resolvers: LinkedStateResolvers<TLinked>,
): object => {
  const proto = {};
  for (const key of Object.keys(resolvers) as (keyof TLinked & string)[]) {
    const resolve = resolvers[key];
    let cached: unknown;
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        if (selectorDepth === 0) {
          throw new Error(
            `${scope}.${key} is linked child scope state and can only be read inside a useAuiState(selector) callback. ` +
              `Read the child scope directly (useAuiState) or use the ids/count field on ${scope} instead.`,
          );
        }
        const next = resolve();
        if (
          Array.isArray(next) &&
          Array.isArray(cached) &&
          shallowEqualArray(cached, next)
        ) {
          return cached;
        }
        cached = next;
        return next;
      },
    });
  }
  return proto;
};

export const withLinkedState = <TOwn extends object, TLinked extends object>(
  proto: object,
  own: TOwn,
): TOwn & TLinked => Object.assign(Object.create(proto), own);

export const useLinkedState = <TOwn extends object, TLinked extends object>(
  scope: string,
  own: TOwn,
  resolvers: LinkedStateResolvers<TLinked>,
): TOwn & TLinked => {
  const resolversRef = useRef(resolvers);
  resolversRef.current = resolvers;
  const proto = useMemo(
    () =>
      createLinkedStateProto<TLinked>(
        scope,
        Object.fromEntries(
          Object.keys(resolvers).map((key) => [
            key,
            () => resolversRef.current[key as keyof TLinked](),
          ]),
        ) as LinkedStateResolvers<TLinked>,
      ),
    [scope],
  );
  const stableOwn = useShallowStable(own, shallowEqualObject);
  return useMemo(
    () => withLinkedState<TOwn, TLinked>(proto, stableOwn),
    [proto, stableOwn],
  );
};
