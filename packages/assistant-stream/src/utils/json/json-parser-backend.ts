import type { ReadonlyJSONObject } from "./json-value";

/** Retained backends must preserve their arguments. */
export type JsonParserBackend = {
  readonly currentArgs: ReadonlyJSONObject;
  append(delta: string): JsonParserBackend | undefined;
};

export type JsonParserBackendContext = {
  readonly text: string;
  readonly fallback: ReadonlyJSONObject;
  /** Detaches mutable values and attaches assistant-stream's partial-field metadata. */
  readonly createSnapshot: (
    value: ReadonlyJSONObject,
    state: "partial" | "complete",
    partialPath: readonly (string | number)[],
  ) => ReadonlyJSONObject;
};

/** Return undefined for input that cannot preserve the native parser's values and metadata. */
export type JsonParserBackendFactory = (
  context: JsonParserBackendContext,
) => JsonParserBackend | undefined;

const registryKey = Symbol.for("assistant-stream.json-parser-backends.v1");
type Registration = { factory: JsonParserBackendFactory };
const registryHost = globalThis as typeof globalThis & {
  [registryKey]?: Registration[];
};

/**
 * Registers a backend for new shared JSON parsers in this JavaScript realm.
 * The most recent registration takes precedence, including across package copies.
 * The backend must preserve native values, metadata, and independent branches;
 * returning undefined or throwing falls back to native parsing.
 * Unregistering removes only this registration and leaves existing parsers intact.
 */
export const registerJsonParserBackend = (
  factory: JsonParserBackendFactory,
): (() => void) => {
  const registrations = (registryHost[registryKey] ??= []);
  const registration = { factory };
  registrations.push(registration);
  return () => {
    const index = registrations.indexOf(registration);
    if (index !== -1) registrations.splice(index, 1);
  };
};

export const createJsonParserBackend = (context: JsonParserBackendContext) =>
  registryHost[registryKey]?.at(-1)?.factory(context);
