import {
  presentToolBase,
  promptUserToolBase,
  type JSONGenerativeUIOptions,
  type PresentTool,
  type PresentToolOptions,
  type PromptUserTool,
} from "./JSONGenerativeUI.shared";
import { renderGenerativeUI } from "./renderGenerativeUI";
import type { GenerativeUILibrary, GenerativeUIStatus } from "./types";

/**
 * Maps a tool-call part status to the generative-UI streaming status. Only a
 * `complete` call has fully-arrived args; `running` and `incomplete`
 * (aborted/errored, so args may be partial) both render as `"streaming"` so a
 * non-streaming component is never handed partial props.
 */
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
 * result.
 */
export class JSONGenerativeUI {
  private readonly library: GenerativeUILibrary;

  constructor(options: JSONGenerativeUIOptions) {
    this.library = options.library;
  }

  present(options?: PresentToolOptions): PresentTool {
    const library = this.library;
    return {
      ...presentToolBase(library, options),
      execute: async () => ({}),
      render: ({ args, status }) =>
        renderGenerativeUI(args, library, { status: uiStatus(status) }),
    };
  }

  promptUser(): PromptUserTool {
    const library = this.library;
    return {
      ...promptUserToolBase(library),
      render: ({ args, status }) =>
        renderGenerativeUI(args, library, { status: uiStatus(status) }),
    };
  }
}
