export declare const EXPERIMENTAL_NAME: RegExp;

export declare const EXPERIMENTAL_NOTICE: string;

export declare function experimentalTag(since: string): string;

export type DeprecatedTag =
  | { kind: "empty" }
  | { kind: "deprecated" }
  | { kind: "experimental"; since: string }
  | { kind: "invalid"; reason: string };

export declare function parseDeprecatedTag(text: string): DeprecatedTag;
