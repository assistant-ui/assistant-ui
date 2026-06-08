import { isRecord } from "../common";
import type { ScopePreview } from "./types";

const parseScope = (value: unknown): ScopePreview | null => {
  if (!isRecord(value) || typeof value.name !== "string") return null;

  const methods = Array.isArray(value.methods)
    ? value.methods.filter(
        (method): method is string => typeof method === "string",
      )
    : [];

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

  // Root scopes first, then by name, so the graph reads parent-before-child.
  return scopes.sort((a, b) => {
    const rootDelta = Number(b.source === "root") - Number(a.source === "root");
    return rootDelta !== 0 ? rootDelta : a.name.localeCompare(b.name);
  });
};
