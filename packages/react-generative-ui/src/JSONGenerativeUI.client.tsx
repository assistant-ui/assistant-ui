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
import { renderGenerativeUI } from "./renderGenerativeUI";
import type { GenerativeUILibrary, GenerativeUIStatus } from "./types";

/** Maps a tool-call part status to the generative-UI streaming status. Only a
 * `complete` call has fully-arrived args; `running` and `incomplete`
 * (aborted/errored, so args may be partial) both render as `"streaming"` so a
 * non-streaming component is never handed partial props. */
function uiStatus(status: { type: string }): GenerativeUIStatus {
  return status.type === "complete" ? "done" : "streaming";
}

/**
 * Client build of {@link JSONGenerativeUI}, resolved through the package's
 * `default` export condition (browser and SSR).
 *
 * `present` is a frontend tool that renders the model's `{ $type, ...props }`
 * tree against the library and resolves immediately. `prompt_user` is a
 * human-in-the-loop tool: the model pauses and the rendered UI supplies the
 * result. Both draw the tree the same way, so they share one `render`.
 */
export class JSONGenerativeUI {
  private readonly library: GenerativeUILibrary;
  private readonly parameters: PresentParameters;

  constructor(options: JSONGenerativeUIOptions) {
    this.library = options.library;
    this.parameters = buildPresentParameters(options.library);
  }

  private readonly render = ({
    args,
    status,
  }: {
    args: unknown;
    status: { type: string };
  }): ReactNode =>
    renderGenerativeUI(args, this.library, { status: uiStatus(status) });

  present(options?: PresentToolOptions): PresentTool {
    return {
      ...presentToolBase(this.parameters, options),
      execute: async () => ({}),
      render: this.render,
    };
  }

  promptUser(): PromptUserTool {
    return {
      ...promptUserToolBase(this.parameters),
      render: this.render,
    };
  }
}
