import type { ReactNode } from "react";
import type { Unstable_InteractableStateSchema } from "../types/scopes/interactables";
import type { ToolDefinition } from "./toolbox";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import {
  unstable_useInteractable as useInteractable,
  type Unstable_InferInteractableState,
  type Unstable_InteractableVersionInfo,
} from "./useInteractable";
import { unstable_useInteractableState as useInteractableState } from "./useInteractableState";

/** @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release. */
export type Unstable_InteractableToolRenderProps<TState> = {
  /**
   * The live state. While `streaming` is true, fields the model has not
   * finished generating may still be missing.
   */
  state: TState;
  setState: (updater: TState | ((prev: TState) => TState)) => void;
  /**
   * This message's version of the instance: its state as of this point in the
   * conversation, whether it is the most recent edit, and a `restore()` back
   * to it. `undefined` while streaming.
   */
  version: Unstable_InteractableVersionInfo<TState> | undefined;
  id: string;
  /** True while the tool call's arguments are still streaming in. */
  streaming: boolean;
};

/** @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release. */
export type Unstable_InteractableToolConfig<
  TSchema extends Unstable_InteractableStateSchema,
> = {
  /**
   * The interactable's name, which names its generated `update_{name}` tool
   * and its versions. Defaults to the toolkit entry key, the creating tool's
   * name; set it to name the creating tool apart, as `create_notepad` beside
   * `update_notepad`.
   */
  name?: string | undefined;
  description: string;
  stateSchema: TSchema;
  render: (
    props: Unstable_InteractableToolRenderProps<
      Unstable_InferInteractableState<TSchema>
    >,
  ) => ReactNode;
};

const noop = () => {};

const UPDATE_TOOL_PREFIX = "update_";

/**
 * Defines a tool that creates a thread-scoped interactable from its arguments,
 * for assignment to a toolkit entry — the entry key is the creating tool's
 * name, and the interactable's unless `name` gives it another:
 *
 * ```tsx
 * notepad: unstable_interactableTool({
 *   description: "A notepad the user can read and edit.",
 *   stateSchema: notepadSchema,
 *   render: (props) => <Notepad {...props} />,
 * }),
 * ```
 *
 * `render` shows at the creating call and — installed automatically — at every
 * `update_{name}` call, with streaming previews, instance-id wiring, and
 * registration handled. It receives the live `state`/`setState` plus this
 * message's `version`; whether older messages render frozen history or stay
 * live-editable is the render function's choice.
 *
 * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
 */
export const unstable_interactableTool = <
  TSchema extends Unstable_InteractableStateSchema,
>(
  config: Unstable_InteractableToolConfig<TSchema>,
): ToolDefinition<
  Record<string, unknown>,
  { success: true; interactable?: string | undefined }
> => {
  type TState = Unstable_InferInteractableState<TSchema>;
  type UpdateArgs = { id?: string | undefined } & Record<string, unknown>;
  type UpdateResult =
    | { success: true; id: string }
    | { success: false; error: string };

  const Anchor = ({
    name,
    id,
    initial,
  }: {
    name: string;
    id?: string | undefined;
    initial: TState;
  }) => {
    const [state, { id: resolvedId, setState, version }] = useInteractable(
      name,
      {
        id,
        description: config.description,
        stateSchema: config.stateSchema,
        initialState: initial,
        updateRender: UpdateToolUI,
      },
    );
    return (
      <>
        {config.render({
          state,
          setState,
          version,
          id: resolvedId,
          streaming: false,
        })}
      </>
    );
  };

  const StreamingUpdate = ({ id }: { id: string }) => {
    const [state, { setState }] = useInteractableState<TState>(id);
    if (state === undefined) return null;
    return (
      <>
        {config.render({
          state,
          setState,
          version: undefined,
          id,
          streaming: true,
        })}
      </>
    );
  };

  const UpdateToolUI: ToolCallMessagePartComponent<
    UpdateArgs,
    UpdateResult
  > = ({ toolName, args, result }) => {
    if (!result) {
      return typeof args.id === "string" ? (
        <StreamingUpdate id={args.id} />
      ) : null;
    }
    if (!result.success) return null;
    const { id: _id, ...partial } = args;
    // Without `name`, the interactable is named after the creating tool (the
    // toolkit entry key), so the update tool's name reverses by stripping the
    // prefix.
    return (
      <Anchor
        name={config.name ?? toolName.slice(UPDATE_TOOL_PREFIX.length)}
        initial={partial as TState}
      />
    );
  };

  const InteractableToolUI: ToolCallMessagePartComponent<
    Record<string, unknown>,
    { success: true; interactable?: string | undefined }
  > = ({ toolName, toolCallId, args, result }) => {
    const state = args as TState;
    if (!result) {
      return (
        <>
          {config.render({
            state,
            setState: noop,
            version: undefined,
            id: toolCallId,
            streaming: true,
          })}
        </>
      );
    }
    return (
      <Anchor name={config.name ?? toolName} id={toolCallId} initial={state} />
    );
  };

  return {
    type: "frontend",
    description: config.description,
    parameters: config.stateSchema,
    display: "standalone",
    // The result names the interactable when the tool is named apart from it,
    // so the thread record alone shows which interactable this call created.
    execute: async () =>
      config.name === undefined
        ? { success: true as const }
        : { success: true as const, interactable: config.name },
    render: InteractableToolUI,
  };
};
