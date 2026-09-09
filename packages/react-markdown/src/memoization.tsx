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
  ignoreMetadata = false,
): boolean => {
  if (Object.is(prev, next)) return true;

  if (
    typeof prev !== "object" ||
    prev === null ||
    typeof next !== "object" ||
    next === null
  )
    return false;

  if (Array.isArray(prev) || Array.isArray(next)) {
    if (!Array.isArray(prev) || !Array.isArray(next)) return false;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
      if (!areValuesEqual(prev[i], next[i])) return false;
    }
    return true;
  }

  const previous = prev as Record<string, unknown>;
  const following = next as Record<string, unknown>;
  let previousKeys = 0;
  let followingKeys = 0;

  for (const key in previous) {
    if (
      !Object.hasOwn(previous, key) ||
      (ignoreMetadata && (key === "position" || key === "data"))
    )
      continue;
    previousKeys += 1;
    if (
      !Object.hasOwn(following, key) ||
      !areValuesEqual(previous[key], following[key])
    )
      return false;
  }

  for (const key in following) {
    if (
      Object.hasOwn(following, key) &&
      !(ignoreMetadata && (key === "position" || key === "data"))
    )
      followingKeys += 1;
  }

  return previousKeys === followingKeys;
};

export const areNodesEqual = (
  prev: Element | undefined,
  next: Element | undefined,
) => {
  if (!prev || !next) return false;
  if (prev === next) return true;

  return (
    areValuesEqual(prev.properties, next.properties, true) &&
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
