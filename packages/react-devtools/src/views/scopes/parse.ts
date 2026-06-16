import { isRecord, isStringArray } from "../common";
import type { ScopePreview } from "./types";

const parseScope = (value: unknown): ScopePreview | null => {
  if (!isRecord(value) || typeof value.name !== "string") return null;

  const methods = isStringArray(value.methods);

  return {
    name: value.name,
    source: typeof value.source === "string" ? value.source : null,
    query: value.query,
    methods,
  };
};

export const parseScopes = (value: unknown): ScopePreview[] => {
  if (!Array.isArray(value)) return [];

  const scopes = value
    .map((scope) => parseScope(scope))
    .filter((scope): scope is ScopePreview => Boolean(scope));

  // Root scopes first, then alphabetically by name. This is not a full
  // hierarchy sort: a derived scope can sort before its parent.
  return scopes.sort((a, b) => {
    const rootDelta = Number(b.source === "root") - Number(a.source === "root");
    return rootDelta !== 0 ? rootDelta : a.name.localeCompare(b.name);
  });
};
