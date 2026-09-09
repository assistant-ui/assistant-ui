import type { Element } from "hast";
import type { ComponentPropsWithoutRef, ComponentType } from "react";

export type PreComponent = ComponentType<
  ComponentPropsWithoutRef<"pre"> & { node?: Element | undefined }
>;
export type CodeComponent = ComponentType<
  ComponentPropsWithoutRef<"code"> & { node?: Element | undefined }
>;

export type CodeHeaderProps = {
  node?: Element | undefined;
  language: string | undefined;
  code: string;
};

export type SyntaxHighlighterProps = {
  node?: Element | undefined;
  components: {
    Pre: PreComponent;
    Code: CodeComponent;
  };
  language: string;
  code: string;
};

export type ComponentsByLanguage = Record<
  string,
  {
    CodeHeader?: ComponentType<CodeHeaderProps> | undefined;
    SyntaxHighlighter?: ComponentType<SyntaxHighlighterProps> | undefined;
  }
>;

// The documented usage is an inline object literal, so compare entries rather
// than requiring callers to preserve the map identity.
export const compareComponentsByLanguage = (
  prev: Record<string, ComponentsByLanguage[string] | undefined> | undefined,
  next: Record<string, ComponentsByLanguage[string] | undefined> | undefined,
): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  const prevKeys = Object.keys(prev);
  if (prevKeys.length !== Object.keys(next).length) return false;
  for (const key of prevKeys) {
    if (!Object.hasOwn(next, key)) return false;
    const prevEntry = prev[key];
    const nextEntry = next[key];
    if (prevEntry === nextEntry) continue;
    if (!prevEntry || !nextEntry) return false;
    if (
      prevEntry.SyntaxHighlighter !== nextEntry.SyntaxHighlighter ||
      prevEntry.CodeHeader !== nextEntry.CodeHeader
    )
      return false;
  }
  return true;
};

export const parseLanguageClass = (className: string | undefined): string =>
  /language-([^\s]+)/.exec(className ?? "")?.[1] ?? "";
