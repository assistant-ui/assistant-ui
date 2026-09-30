import type { ReadonlyJSONValue } from "assistant-stream/utils";

/**
 * One step of a scripted reply. Both fixture routes play the same steps: the
 * AI SDK route as UI message chunks, the model route as assistant-stream parts.
 */
export type FixtureStep =
  /** Streams word by word into a text part. */
  | { type: "text"; text: string }
  /** Streams word by word into a reasoning part. */
  | { type: "reasoning"; text: string }
  /**
   * A tool call. With a `result`, the host answers it (a backend tool); without
   * one, the call waits for the webview (a frontend or human tool). A tool UI
   * registered for `toolName` in `webview/fixture-ui/` renders it.
   */
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      result?: unknown;
      /** Answers the call with `result` as an error. */
      isError?: boolean;
    }
  /** A URL source citation. */
  | { type: "source"; id: string; url: string; title?: string }
  /** A file part with a `data:` URL; neither transport carries a file name. */
  | { type: "file"; mediaType: string; data: string }
  /** A named data part, rendered by a data UI registered for `name`. */
  | { type: "data"; name: string; data: ReadonlyJSONValue }
  /** Fails the stream. */
  | { type: "error"; message: string };

export type FixtureInput = {
  prompt: string;
  toolResults: ReadonlyMap<string, unknown>;
};

export type Fixture = {
  /** The first word of a prompt selects the fixture; lower case, no spaces. */
  name: string;
  description: string;
  /** A prompt that selects this fixture; it must start with `name`. */
  prompt: string;
  script(input: FixtureInput): FixtureStep[];
};

/** Types the default export of a file in `src/fixtures/rich/`. */
export const defineFixtures = (fixtures: readonly Fixture[]) => fixtures;
