"use client";

import {
  AssistantRuntimeProvider,
  Tools,
  type Toolkit,
  useAui,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { z } from "zod";
import { MyThread } from "./MyThread";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";

const toolkit = {
  execute_js: {
    type: "frontend",
    description: "Execute JavaScript code and return the result",
    parameters: z.object({
      code: z.string().describe("The JavaScript code to execute"),
    }),
    execute: async ({ code }) => {
      try {
        const result = eval(code);
        return { success: true, result: String(result) };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    },
    render: ({ args, result, status }) => (
      <div className="bg-muted/30 my-2 rounded-lg border p-4 text-sm">
        <p className="mb-1 font-semibold">execute_js</p>
        <pre className="bg-background rounded p-2 font-mono text-xs whitespace-pre-wrap">
          {args.code}
        </pre>
        {status.type !== "running" && result && (
          <div className="mt-2 border-t pt-2">
            <p className="text-muted-foreground font-semibold">
              {result.success ? "Result:" : "Error:"}
            </p>
            <pre className="font-mono text-xs whitespace-pre-wrap">
              {result.success ? result.result : result.error}
            </pre>
          </div>
        )}
      </div>
    ),
  },
} satisfies Toolkit;

function MyThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Calculate Fibonacci(20)",
        label: "with chain of thought",
        prompt:
          "Calculate the 20th Fibonacci number using JavaScript and show your reasoning.",
      },
      {
        title: "Research with citations",
        label: "show sources",
        prompt:
          "Research recent developments in renewable energy and cite your sources.",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <MyThread />
    </AuiProvider>
  );
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <div className="h-full">
        <MyThreadWithSuggestions />
      </div>
    </AssistantRuntimeProvider>
  );
}
