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

/**
 * The schema-only half of the `present` tool, shared by both builds. The server
 * build returns exactly this; the client build adds `execute` and `render`.
 */
export function presentToolBase(library: GenerativeUILibrary) {
  return {
    type: "frontend" as const,
    description: PRESENT_DESCRIPTION,
    parameters: buildPresentParameters(library),
  };
}

/**
 * The schema-only half of the `prompt_user` tool, shared by both builds. The
 * server build returns exactly this; the client build adds `render`.
 */
export function promptUserToolBase(library: GenerativeUILibrary) {
  return {
    type: "human" as const,
    description: PROMPT_USER_DESCRIPTION,
    parameters: buildPresentParameters(library),
  };
}
