"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { Unstable_InteractableStateSchema } from "../types/scopes/interactables";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import {
  unstable_getInteractableVersions as getInteractableVersions,
  interactableToolName,
} from "../../model-context/interactable-composer-metadata";
import { unstable_useInteractableState as useInteractableState } from "./useInteractableState";
import { useJSONEqual } from "../utils/useJSONEqual";

/**
 * The state type described by an interactable's `stateSchema`. Resolves the
 * output type of a StandardSchemaV1 schema (e.g. Zod); plain JSON Schema
 * falls back to `unknown`.
 */
export type Unstable_InferInteractableState<TSchema> = TSchema extends {
  "~standard": { types?: { output: infer TOutput } | undefined };
}
  ? TOutput
  : unknown;

/**
 * One message's version of an interactable, for components rendered inside
 * tool-call parts. Show `state` to display history; call `restore()` to set
 * the live instance back to it.
 */
export type Unstable_InteractableVersionInfo<TState> = {
  /** The interactable's state as it was at this message. */
  state: TState;
  /** Whether this message holds the instance's most recent tool-driven version. */
  isLatest: boolean;
  /** Sets the live state back to this version. */
  restore: () => void;
};

/**
 * Unstable / Experimental — the interactables API is still evolving and may change in any release.
 * @deprecated Unstable / Experimental (not actually removed).
 */
export type Unstable_InteractableConfig<
  TSchema extends Unstable_InteractableStateSchema,
> = {
  description: string;
  stateSchema: TSchema;
  initialState: Unstable_InferInteractableState<TSchema>;
  /** Unique instance ID; required to address this instance when multiple interactables share a name. Auto-generated if omitted. */
  id?: string | undefined;
  /**
   * Component installed as the tool UI for this interactable's `update_{name}`
   * tool calls, so a model edit re-renders the interactable at the message
   * that made it instead of only mutating an earlier one. Prefer
   * `unstable_interactableTool`, which wires this up. Pass a stable component reference;
   * changing identity re-registers the tool UI.
   */
  updateRender?: ToolCallMessagePartComponent | undefined;
};

const useInteractable = <TSchema extends Unstable_InteractableStateSchema>(
  name: string,
  config: Unstable_InteractableConfig<TSchema>,
): readonly [
  Unstable_InferInteractableState<TSchema>,
  {
    id: string;
    /**
     * This message's version of the instance, when rendered inside a
     * tool-created interactable message part; `undefined` elsewhere.
     */
    version:
      | Unstable_InteractableVersionInfo<
          Unstable_InferInteractableState<TSchema>
        >
      | undefined;
    setState: (
      updater:
        | Unstable_InferInteractableState<TSchema>
        | ((
            prev: Unstable_InferInteractableState<TSchema>,
          ) => Unstable_InferInteractableState<TSchema>),
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
  const internalScope =
    part?.toolName === name || part?.toolName === updateToolName
      ? "thread"
      : undefined;

  const stateSchemaRef = useRef(config.stateSchema);
  stateSchemaRef.current = config.stateSchema;
  const initialStateRef = useRef(config.initialState);
  initialStateRef.current = config.initialState;

  const interactables = useAuiState(() => aui.unstable_interactables());

  useEffect(() => {
    return interactables.register({
      id,
      name,
      description: config.description,
      stateSchema: stateSchemaRef.current,
      initialState: initialStateRef.current,
      updateRender: config.updateRender,
      ...(internalScope ? { scope: internalScope } : {}),
    } as Parameters<typeof interactables.register>[0] & {
      scope?: "thread" | undefined;
    });
  }, [
    interactables,
    id,
    name,
    config.description,
    internalScope,
    config.updateRender,
  ]);

  const myToolCallId = part?.toolCallId;

  const [registeredState, methods] =
    useInteractableState<Unstable_InferInteractableState<TSchema>>(id);
  const { setState } = methods;

  const versionValue = useAuiState(
    useJSONEqual((s) => {
      if (!internalScope || !myToolCallId) return undefined;
      const versions = getInteractableVersions(s.thread.messages, id, name);
      if (!versions.some((v) => v.origin === "create" && v.toolCallId === id)) {
        return undefined;
      }
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
        state: versionValue.state as Unstable_InferInteractableState<TSchema>,
        isLatest: versionValue.isLatest,
        restore: () =>
          setState(
            versionValue.state as Unstable_InferInteractableState<TSchema>,
          ),
      },
    [versionValue, setState],
  );

  const state =
    registeredState === undefined ? config.initialState : registeredState;

  return [state, { id, version, ...methods }] as const;
};

/**
 * Registers an interactable with the AI assistant and returns its live state,
 * like `useState` that the model can also read and update.
 *
 * Call this once per place that shows the interactable. Other components can
 * read and write the same instance by passing its `id` to
 * `unstable_useInteractableState`.
 *
 * For tool-created interactables rendered inside tool-call message parts,
 * `version` carries this message's version of the instance — its state as of
 * that point in the conversation, whether it is the most recent tool-driven
 * version, and a `restore()` back to it. Whether older messages render frozen history or stay
 * live-editable is the component's choice. Inside an `update_{name}` part the
 * instance `id` is inferred from the call, so the same component works at the
 * creating call and at update calls.
 *
 * @deprecated Unstable / Experimental (not actually removed).
 */
export const unstable_useInteractable: <
  TSchema extends Unstable_InteractableStateSchema,
>(
  name: string,
  config: Unstable_InteractableConfig<TSchema>,
) => readonly [
  Unstable_InferInteractableState<TSchema>,
  {
    id: string;
    version:
      | Unstable_InteractableVersionInfo<
          Unstable_InferInteractableState<TSchema>
        >
      | undefined;
    setState: (
      updater:
        | Unstable_InferInteractableState<TSchema>
        | ((
            prev: Unstable_InferInteractableState<TSchema>,
          ) => Unstable_InferInteractableState<TSchema>),
    ) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  },
] = useInteractable;
