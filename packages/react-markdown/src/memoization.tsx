import type { Element } from "hast";
import {
  type ComponentProps,
  type ComponentType,
  type ElementType,
  memo,
} from "react";
import type {
  CodeHeaderProps,
  SyntaxHighlighterProps,
} from "./overrides/types";

type Components = {
  [Key in Extract<ElementType, string>]?: ComponentType<ComponentProps<Key>>;
} & {
  SyntaxHighlighter?:
    | ComponentType<Omit<SyntaxHighlighterProps, "node">>
    | undefined;
  CodeHeader?: ComponentType<Omit<CodeHeaderProps, "node">> | undefined;
};

const areValuesEqual = (
  prev: unknown,
  next: unknown,
  depth = 0,
  skipMetadata = false,
): boolean => {
  if (Object.is(prev, next)) return true;
  if (depth >= 100) return false;
  if (typeof prev !== "object" || prev === null) return false;
  if (typeof next !== "object" || next === null) return false;

  if (Array.isArray(prev)) {
    if (!Array.isArray(next) || prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
      if (!areValuesEqual(prev[i], next[i], depth + 1)) return false;
    }
    return true;
  }
  if (Array.isArray(next)) return false;

  const prevPrototype = Object.getPrototypeOf(prev);
  const nextPrototype = Object.getPrototypeOf(next);
  if (prevPrototype !== Object.prototype && prevPrototype !== null)
    return false;
  if (nextPrototype !== Object.prototype && nextPrototype !== null)
    return false;

  const prevRecord = prev as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  let prevKeys = 0;
  for (const key in prevRecord) {
    if (!Object.hasOwn(prevRecord, key)) continue;
    if (skipMetadata && (key === "position" || key === "data")) continue;
    if (
      !Object.prototype.propertyIsEnumerable.call(nextRecord, key) ||
      !areValuesEqual(prevRecord[key], nextRecord[key], depth + 1)
    )
      return false;
    prevKeys++;
  }
  let nextKeys = 0;
  for (const key in nextRecord) {
    if (!Object.hasOwn(nextRecord, key)) continue;
    if (skipMetadata && (key === "position" || key === "data")) continue;
    nextKeys++;
  }
  return prevKeys === nextKeys;
};

export const areNodesEqual = (
  prev: Element | undefined,
  next: Element | undefined,
) => {
  if (!prev || !next) return false;
  if (prev === next) return true;

  return (
    areValuesEqual(prev.properties, next.properties, 0, true) &&
    areValuesEqual(prev.children, next.children)
  );
};

export const memoCompareNodes = (
  prev: { node?: Element | undefined },
  next: { node?: Element | undefined },
) => {
  return areNodesEqual(prev.node, next.node);
};

export const memoizeMarkdownComponents = (components: Components = {}) => {
  return Object.fromEntries(
    Object.entries(components ?? {}).map(([key, value]) => {
      if (!value) return [key, value];

      const Component = value as ComponentType;
      const WithoutNode = ({ node, ...props }: { node?: Element }) => {
        return <Component {...props} />;
      };
      return [key, memo(WithoutNode, memoCompareNodes)];
    }),
  );
};
