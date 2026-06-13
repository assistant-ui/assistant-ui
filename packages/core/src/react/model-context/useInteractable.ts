"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  InteractableScope,
  InteractableStateSchema,
} from "../types/scopes/interactables";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import {
  getInteractableVersions,
  interactableToolName,
} from "../../model-context/interactable-composer-metadata";
import { useInteractableState } from "./useInteractableState";
import { useJSONEqual } from "../utils/useJSONEqual";

/**
 * The state type described by an interactable's `stateSchema`. Resolves the
 * output type of a StandardSchemaV1 schema (e.g. Zod); plain JSON Schema
 * falls back to `unknown`.
 */
export type InferInteractableState<TSchema> = TSchema extends {
  "~standard": { types?: { output: infer TOutput } | undefined };
}
  ? TOutput
  : unknown;

/**
 * One message's version of an interactable, for components rendered inside
 * tool-call parts. Show `state` to display history; call `restore()` to set
 * the live instance back to it.
 */
export type InteractableVersionInfo<TState> = {
  /** The interactable's state as it was at this message. */
  state: TState;
  /** Whether this message holds the instance's most recent tool-driven version. */
  isLatest: boolean;
  /** Sets the live state back to this version. */
  restore: () => void;
};

export type InteractableConfig<TSchema extends InteractableStateSchema> = {
  description: string;
  stateSchema: TSchema;
  initialState: InferInteractableState<TSchema>;
  /** Unique instance ID; required to address this instance when multiple interactables share a name. Auto-generated if omitted. */
  id?: string | undefined;
  /**
   * Persistence + reload-seed source. `"app"` (default) participates in the BYO
   * adapter; `"thread"` persists via the per-send snapshot in thread history.
   */
  scope?: InteractableScope | undefined;
  /**
   * Component installed as the tool UI for this interactable's `update_{name}`
   * tool calls, so a model edit re-renders the interactable at the message
   * that made it instead of only mutating an earlier one. Prefer
   * `interactableTool`, which wires this up. Pass a stable component reference;
   * changing identity re-registers the tool UI.
   */
  updateRender?: ToolCallMessagePartComponent | undefined;
};

/**
 * Registers an interactable with the AI assistant and returns its live state,
 * like `useState` that the model can also read and update.
 *
 * Call this once per place that shows the interactable. Other components can
 * read and write the same instance by passing its `id` to
 * {@link useInteractableState}.
 *
 * For `scope: "thread"` interactables rendered inside tool-call message parts,
 * `version` carries this message's version of the instance — its state as of
 * that point in the conversation, whether it is the most recent tool-driven
 * version, and a `restore()` back to it. Whether older messages render frozen history or stay
 * live-editable is the component's choice. Inside an `update_{name}` part the
 * instance `id` is inferred from the call, so the same component works at the
 * creating call and at update calls.
 */
export const useInteractable = <TSchema extends InteractableStateSchema>(
  name: string,
  config: InteractableConfig<TSchema>,
): readonly [
  InferInteractableState<TSchema>,
  {
    id: string;
    /**
     * This message's version of the instance, when rendered inside a
     * tool-call part with `scope: "thread"`; `undefined` outside messages and
     * for app scope.
     */
    version:
      | InteractableVersionInfo<InferInteractableState<TSchema>>
      | undefined;
    setState: (
      updater:
        | InferInteractableState<TSchema>
        | ((
            prev: InferInteractableState<TSchema>,
          ) => InferInteractableState<TSchema>),
    ) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  },
] => {
  const aui = useAui();

  const autoId = useId().replace(/[^a-zA-Z0-9]/g, "");

  // Whether this component renders inside a message part is fixed for its
  // lifetime, so conditioning the selectors on it is safe.
  const inPart = aui.part.source != null;
  const isThreadAnchor = inPart && config.scope === "thread";

  const updateToolName = interactableToolName(name);
  const part = useAuiState((s) => {
    if (!inPart) return undefined;
    const p = s.part;
    return p.type === "tool-call" ? p : undefined;
  });

  // Inside an update_{name} part, the instance id comes from the call itself:
  // the result's resolved id (covers id-less calls), or the id argument.
  let inferredId: string | undefined;
  if (part?.toolName === updateToolName) {
    const result = part.result as Record<string, unknown> | undefined;
    const args = part.args as Record<string, unknown> | undefined;
    if (result?.success !== false) {
      if (typeof result?.id === "string") inferredId = result.id;
      else if (typeof args?.id === "string") inferredId = args.id;
    }
  }

  const id = config.id ?? inferredId ?? autoId;

  const stateSchemaRef = useRef(config.stateSchema);
  stateSchemaRef.current = config.stateSchema;
  const initialStateRef = useRef(config.initialState);
  initialStateRef.current = config.initialState;

  const interactables = useAuiState(() => aui.interactables());

  useEffect(() => {
    return interactables.register({
      id,
      name,
      description: config.description,
      stateSchema: stateSchemaRef.current,
      initialState: initialStateRef.current,
      scope: config.scope,
      updateRender: config.updateRender,
    });
  }, [
    interactables,
    id,
    name,
    config.description,
    config.scope,
    config.updateRender,
  ]);

  const myToolCallId = part?.toolCallId;

  const [registeredState, methods] =
    useInteractableState<InferInteractableState<TSchema>>(id);
  const { setState } = methods;

  const versionValue = useAuiState(
    useJSONEqual((s) => {
      if (!isThreadAnchor || !myToolCallId) return undefined;
      const versions = getInteractableVersions(s.thread.messages, id, name);
      const mine = versions.find((v) => v.toolCallId === myToolCallId);
      if (!mine) return undefined;
      const latestToolCallId = versions.findLast(
        (v) => v.toolCallId !== undefined,
      )?.toolCallId;
      return { state: mine.state, isLatest: latestToolCallId === myToolCallId };
    }),
  );

  const version = useMemo(
    () =>
      versionValue && {
        state: versionValue.state as InferInteractableState<TSchema>,
        isLatest: versionValue.isLatest,
        restore: () =>
          setState(versionValue.state as InferInteractableState<TSchema>),
      },
    [versionValue, setState],
  );

  const state =
    registeredState === undefined ? config.initialState : registeredState;

  return [state, { id, version, ...methods }] as const;
};
