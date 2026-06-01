import type { ToolDefinition } from "@assistant-ui/react";
import { buildPresentParameters } from "./buildPresentParameters";
import type { GenerativeUILibrary } from "./types";

/** Options for {@link JSONGenerativeUI}. */
export type JSONGenerativeUIOptions = {
  /**
   * The components the model is allowed to render, keyed by the `$type` it
   * selects them with. Author it with `defineGenerativeComponents({ ... })` so a
   * `"use generative"` build can split each `render` from its `properties`.
   */
  library: GenerativeUILibrary;
};

/** Options for {@link JSONGenerativeUI.present}. */
export type PresentToolOptions = {
  /**
   * Whether the rendered UI is shown standalone (its own surface, outside the
   * chain-of-thought trace) or inline. Defaults to the frontend-tool default
   * (inline). Pass `"standalone"` for a full-bleed artifact like a card.
   */
  display?: "standalone" | "inline";
};

/** The `present` tool, as the model sees it (no client `render`/`execute`). */
export type PresentTool = ToolDefinition<
  Record<string, unknown>,
  Record<string, never>
>;

/** The `prompt_user` tool, as the model sees it (no client `render`). */
export type PromptUserTool = ToolDefinition<Record<string, unknown>, unknown>;

const PRESENT_DESCRIPTION =
  "Present a UI component to the user. Select a component with `$type` and " +
  "provide its props inline; nest components with `children`.";

const PROMPT_USER_DESCRIPTION =
  "Present a UI component to the user and wait for their response. Select a " +
  "component with `$type` and provide its props inline; nest components with " +
  "`children`. The user interacts with it and the result is returned to you.";

/** The tool `parameters` schema, built once per instance (see {@link buildPresentParameters}). */
export type PresentParameters = ReturnType<typeof buildPresentParameters>;

/**
 * The schema-only half of the `present` tool, shared by both builds. The server
 * build returns exactly this; the client build adds `execute` and `render`.
 * Takes the already-built `parameters` so it isn't recomputed per tool.
 */
export function presentToolBase(
  parameters: PresentParameters,
  options?: PresentToolOptions,
) {
  return {
    type: "frontend" as const,
    description: PRESENT_DESCRIPTION,
    parameters,
    ...(options?.display ? { display: options.display } : {}),
  };
}

/**
 * The schema-only half of the `prompt_user` tool, shared by both builds. The
 * server build returns exactly this; the client build adds `render`.
 */
export function promptUserToolBase(parameters: PresentParameters) {
  return {
    type: "human" as const,
    description: PROMPT_USER_DESCRIPTION,
    parameters,
  };
}
