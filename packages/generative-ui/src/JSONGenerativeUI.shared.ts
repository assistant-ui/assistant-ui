import type { ToolDefinition } from "@assistant-ui/react";
import type { JSONSchema7 } from "json-schema";
import type { ActionRegistry } from "./actionRegistry";
import type { GenerativeUILibrary } from "./types";

/** Options for {@link JSONGenerativeUI}. */
export type JSONGenerativeUIOptions = {
  /**
   * The components the model is allowed to render, keyed by the `$type` it
   * selects them with. Author it with `defineGenerativeComponents({ ... })` so a
   * `"use generative"` build can split each `render` from its `properties`.
   */
  library: GenerativeUILibrary;
  /**
   * Host-provided map from `$action.type` to its handler. Interactive
   * components (`Button`/`Select`/`Input`/`DatePicker`) call `$dispatch($action)`
   * on their event, which resolves through this registry. Omit it for a
   * read-only render where model-emitted actions degrade to a no-op.
   */
  actions?: ActionRegistry;
};

/** Options for {@link JSONGenerativeUI.present}. */
export type PresentToolOptions = {
  /**
   * Set `"standalone"` to render the component on its own surface (outside the
   * chain-of-thought trace), e.g. a full-bleed artifact like a card. Omit it for
   * the default inline rendering — there is no `"inline"` value because that is
   * already the default.
   */
  display?: "standalone";
};

type BackendDefaultMetadata = {
  unstable_backendDefault?: {
    parameters?: boolean;
  };
};

/** The `present` tool, as the model sees it (no client `render`/`execute`). */
export type PresentTool = ToolDefinition<
  Record<string, unknown>,
  Record<string, never>
> &
  BackendDefaultMetadata;

/** The `prompt_user` tool, as the model sees it (no client `render`). */
export type PromptUserTool = ToolDefinition<Record<string, unknown>, unknown> &
  BackendDefaultMetadata;

const PRESENT_DESCRIPTION =
  "Present a UI component to the user. Select a component with `$type` and " +
  "provide its props inline; nest components with `children`.";

const PROMPT_USER_DESCRIPTION =
  "Present a UI component to the user and wait for their response. Select a " +
  "component with `$type` and provide its props inline; nest components with " +
  "`children`. The user interacts with it and the result is returned to you.";

/** The tool `parameters` schema, built once per instance (see `buildPresentParameters`). */
export type PresentParameters = JSONSchema7;

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
    ...(options?.display !== undefined ? { display: options.display } : {}),
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
