import type { ToolDefinition } from "@assistant-ui/react";
import { buildPresentParameters } from "./buildPresentParameters";
import { renderGenerativeUI } from "./renderGenerativeUI";
import type { GenerativeUILibrary } from "./types";

/**
 * Drives generative UI from a JSON tree the model produces.
 *
 * A {@link GenerativeUILibrary} declares which components the model may render
 * and the schema for each one's props. {@link JSONGenerativeUI.present} turns
 * that library into a frontend tool: the model emits a `{ $type, ...props }`
 * tree and the tool renders it against the library.
 */
export class JSONGenerativeUI {
  constructor(private readonly library: GenerativeUILibrary) {}

  /**
   * Returns the `present` tool: a frontend tool whose arguments are a
   * generative-ui node and whose renderer draws that node from the library.
   */
  present(): ToolDefinition<Record<string, unknown>, Record<string, never>> {
    const library = this.library;
    return {
      type: "frontend",
      description:
        "Present a UI component to the user. Select a component with `$type` " +
        "and provide its props inline; nest components with `children`.",
      parameters: buildPresentParameters(library),
      execute: async () => ({}),
      render: ({ args, status }) => {
        const uiStatus = status.type === "running" ? "streaming" : "done";
        return renderGenerativeUI(args, library, { status: uiStatus });
      },
    };
  }
}
