import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { getPartialJsonObjectMeta } from "assistant-stream/utils";
import type { ReactNode } from "react";
import { buildPresentParameters } from "./buildPresentParameters";
import {
  presentToolBase,
  promptUserToolBase,
  type JSONGenerativeUIOptions,
  type PresentParameters,
  type PresentTool,
  type PresentToolOptions,
  type PromptUserTool,
} from "./JSONGenerativeUI.shared";
import { type ActionRegistry } from "./actionRegistry";
import { renderGenerativeUI } from "./renderGenerativeUI";
import type { GenerativeUILibrary, GenerativeUIStatus } from "./types";

// A cancelled argument stream can leave a tool waiting with partial arguments.
function uiStatus(
  status: { type: string },
  args: Record<string, unknown>,
): GenerativeUIStatus {
  return status.type === "complete" ||
    (status.type === "requires-action" &&
      getPartialJsonObjectMeta(args)?.state !== "partial")
    ? "done"
    : "streaming";
}

/**
 * Client build of {@link JSONGenerativeUI}, resolved through the package's
 * `default` export condition (browser and SSR).
 *
 * `present` is a frontend tool that renders the model's `{ $type, ...props }`
 * tree against the library and resolves immediately. `prompt_user` is a
 * human-in-the-loop tool: the model pauses and the rendered UI supplies the
 * result. Both draw the tree the same way, so they share one `render`. The
 * `actions` registry (if provided) is threaded into the render context so
 * interactive components can fire `$action` through `$dispatch`.
 */
export class JSONGenerativeUI {
  private readonly library: GenerativeUILibrary;
  private readonly parameters: PresentParameters;
  private readonly actions: ActionRegistry | undefined;
  private readonly completedPromptToolCallIds = new Set<string>();

  constructor(options: JSONGenerativeUIOptions) {
    this.library = options.library;
    this.parameters = buildPresentParameters(options.library);
    this.actions = options.actions;
  }

  /**
   * The surface a `present` call paints into. It owns the vertical rhythm
   * between top-level blocks, which the host's message container does not
   * provide, and stays out of the way while it has nothing to show.
   */
  private readonly render = (
    {
      args,
      status,
      addResult,
      result,
      toolCallId,
      unstable_recordInteraction,
    }: ToolCallMessagePartProps<Record<string, unknown>, any>,
    completesPrompt = false,
  ): ReactNode => {
    const actions = this.actions;
    const dispatch = actions
      ? (action: Parameters<ActionRegistry["dispatch"]>[0]) => {
          if (unstable_recordInteraction) {
            try {
              void unstable_recordInteraction({
                type: "action",
                payload: action,
              }).catch(() => {});
            } catch {}
          }

          const actionResult = actions.dispatch(action);
          if (
            completesPrompt &&
            actionResult !== undefined &&
            result === undefined
          ) {
            void Promise.resolve(actionResult)
              .then((response) => {
                if (
                  response !== undefined &&
                  !this.completedPromptToolCallIds.has(toolCallId)
                ) {
                  this.completedPromptToolCallIds.add(toolCallId);
                  addResult(response);
                }
              })
              .catch(() => {});
          }
          return actionResult;
        }
      : undefined;

    return (
      <div data-aui="root">
        {renderGenerativeUI(args, this.library, {
          status: uiStatus(status, args),
          ...(dispatch ? { dispatch } : {}),
        })}
      </div>
    );
  };

  present(options?: PresentToolOptions): PresentTool {
    return {
      ...presentToolBase(this.parameters, options),
      unstable_backendDefault: { parameters: true },
      execute: async () => ({}),
      render: this.render,
    };
  }

  promptUser(): PromptUserTool {
    return {
      ...promptUserToolBase(this.parameters),
      unstable_backendDefault: { parameters: true },
      render: (props) => this.render(props, true),
    };
  }
}
