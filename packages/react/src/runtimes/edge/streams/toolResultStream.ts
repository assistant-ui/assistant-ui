import { Tool } from "../../../model-context/ModelContextTypes";
import { z } from "zod";
import { ToolExecutionStream } from "assistant-stream";

export function toolResultStream(
  tools: Record<string, Tool<any, any>> | undefined,
  abortSignal: AbortSignal,
) {
  return new ToolExecutionStream(async ({ toolCallId, toolName, args }) => {
    const tool = tools?.[toolName];
    if (!tool || !tool.execute) return undefined;

    let executeFn = tool.execute;

    if (tool.parameters instanceof z.ZodType) {
      const result = tool.parameters.safeParse(args);
      if (!result.success) {
        executeFn =
          tool.experimental_onSchemaValidationError ??
          (() => {
            throw (
              "Function parameter validation failed. " +
              JSON.stringify(result.error.issues)
            );
          });
      }
    }

    const result = await executeFn(args, {
      toolCallId,
      abortSignal,
    });

    return result ?? "<no result>";
  });
}
