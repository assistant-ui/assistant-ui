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
  private readonly parameters: PresentParameters;

  constructor(options: JSONGenerativeUIOptions) {
    this.parameters = buildPresentParameters(options.library);
  }

  present(options?: PresentToolOptions): PresentTool {
    return presentToolBase(this.parameters, options) as PresentTool;
  }

  promptUser(): PromptUserTool {
    return promptUserToolBase(this.parameters) as PromptUserTool;
  }
}
