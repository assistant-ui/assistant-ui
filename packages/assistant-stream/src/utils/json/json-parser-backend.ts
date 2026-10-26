import type { ReadonlyJSONObject } from "./json-value";

export type JsonParserBackend = {
  readonly currentTextLength: number;
  readonly currentArgs: ReadonlyJSONObject;
  readonly text: string;
  append(delta: string): JsonParserBackend | undefined;
};

type BackendFactory = (
  text: string,
  fallback: ReadonlyJSONObject,
) => JsonParserBackend | undefined;

let factory: BackendFactory | undefined;

export const setJsonParserBackend = (backend: BackendFactory | undefined) => {
  factory = backend;
};

export const createJsonParserBackend = (
  text: string,
  fallback: ReadonlyJSONObject,
) => factory?.(text, fallback);
