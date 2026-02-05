"use client";

import {
  AssistantRuntimeProvider,
  makeAssistantTool,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { z } from "zod";
import { MyThread } from "./MyThread";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";

const ExecuteJsTool = makeAssistantTool({
  toolName: "execute_js",
  description: "Execute JavaScript code and return the result",
  parameters: z.object({
    code: z.string().describe("The JavaScript code to execute"),
  }),
  execute: async ({ code }) => {
    try {
      // biome-ignore lint/security/noGlobalEval: example code
      const result = eval(code);
      return { success: true, result: String(result) };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
  render: ({ args, result, status }) => (
    <div className="my-2 rounded-lg border bg-muted/30 p-4 text-sm">
      <p className="mb-1 font-semibold">execute_js</p>
      <pre className="whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs">
        {args.code}
      </pre>
      {status.type !== "running" && result && (
        <div className="mt-2 border-t pt-2">
          <p className="font-semibold text-muted-foreground">
            {result.success ? "Result:" : "Error:"}
          </p>
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {result.success ? result.result : result.error}
          </pre>
        </div>
      )}
    </div>
  ),
});

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ExecuteJsTool />
      <div className="h-full">
        <MyThread />
      </div>
    </AssistantRuntimeProvider>
  );
}
