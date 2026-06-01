import {
  presentToolBase,
  promptUserToolBase,
  type JSONGenerativeUIOptions,
  type PresentTool,
  type PromptUserTool,
} from "./JSONGenerativeUI.shared";
import type { GenerativeUILibrary } from "./types";

/**
 * Server build of {@link JSONGenerativeUI}, resolved through the package's
 * `react-server` export condition.
 *
 * The model only needs each tool's `type`, `description`, and `parameters` on
 * the server, so `present`/`prompt_user` return exactly that — no `execute` and
 * no `render`, keeping the renderer (and React) out of the server graph. The
 * client build adds those back. The two builds share one set of public types, so
 * consumers see a single {@link JSONGenerativeUI} either way.
 *
 * `as` casts here because the tool types require a `render` for frontend/human
 * tools; on the server it is structurally absent and never read.
 */
export class JSONGenerativeUI {
  private readonly library: GenerativeUILibrary;

  constructor(options: JSONGenerativeUIOptions) {
    this.library = options.library;
  }

  present(): PresentTool {
    return presentToolBase(this.library) as PresentTool;
  }

  promptUser(): PromptUserTool {
    return promptUserToolBase(this.library) as PromptUserTool;
  }
}
