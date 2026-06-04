"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

type ExecuteJsResult =
  | { success: true; result: string }
  | { success: false; error: string };

export default defineToolkit({
  execute_js: {
    description: "Execute JavaScript code and return the result",
    parameters: z.object({
      code: z.string().describe("The JavaScript code to execute"),
    }),
    execute: async ({ code }) => {
      "use client";
      try {
        const result = eval(code);
        return { success: true, result: String(result) };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
    render: ({ args, result, status }) => {
      const output = result as ExecuteJsResult | undefined;
      return (
        <div className="bg-muted/30 my-2 rounded-lg border p-4 text-sm">
          <p className="mb-1 font-semibold">execute_js</p>
          <pre className="bg-background rounded p-2 font-mono text-xs whitespace-pre-wrap">
            {args.code}
          </pre>
          {status.type !== "running" && output && (
            <div className="mt-2 border-t pt-2">
              <p className="text-muted-foreground font-semibold">
                {output.success ? "Result:" : "Error:"}
              </p>
              <pre className="font-mono text-xs whitespace-pre-wrap">
                {output.success ? output.result : output.error}
              </pre>
            </div>
          )}
        </div>
      );
    },
  },
});
