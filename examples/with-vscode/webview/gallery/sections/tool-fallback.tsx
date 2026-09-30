import {
  ToolFallback,
  ToolFallbackApproval,
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from "@assistant-ui/ui/components/assistant-ui/elements/tool-fallback.aui.tsx";
import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
import { defineSections } from "../types";
import { SeededMessages, SeededRuntime } from "../runtime";

export default defineSections([
  {
    id: "tool-fallback",
    title: "Tool fallback (runtime)",
    category: "agents",
    notes:
      "Seeded tool calls without a registered UI: one with a result, one that failed.",
    render: () => (
      <SeededMessages
        messages={[
          { role: "user", content: "What's the weather in Zurich?" },
          {
            role: "assistant",
            content: [
              { type: "text", text: "Checking the forecast." },
              {
                type: "tool-call",
                toolCallId: "weather-1",
                toolName: "get_weather",
                args: { location: "Zurich", unit: "celsius" },
                result: { temperature: 18, condition: "Cloudy", humidity: 71 },
              },
              {
                type: "tool-call",
                toolCallId: "search-1",
                toolName: "search_workspace_for_a_very_long_tool_name",
                args: { query: "export async function POST" },
                result: "ENOENT: the workspace index is missing",
                isError: true,
              },
            ],
          },
        ]}
        components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }}
      />
    ),
  },
  {
    id: "tool-fallback-parts",
    title: "Tool fallback (composed receipt)",
    category: "agents",
    notes:
      "The composable parts, open, with a settled approval, as in the docs receipt sample. They read the runtime, so they sit in SeededRuntime.",
    render: () => (
      <SeededRuntime>
        <ToolFallbackRoot defaultOpen>
          <ToolFallbackTrigger
            toolName="send_email"
            status={{ type: "complete" }}
          />
          <ToolFallbackContent>
            <ToolFallbackArgs
              argsText={JSON.stringify(
                { to: "team@example.com", subject: "Weekly summary" },
                null,
                2,
              )}
            />
            <ToolFallbackApproval
              approval={{
                id: "send-weekly-summary",
                prompt: "Send the weekly summary to team@example.com?",
                approved: true,
              }}
            />
            <ToolFallbackResult result={{ sent: true, messageId: "msg_01" }} />
          </ToolFallbackContent>
        </ToolFallbackRoot>
      </SeededRuntime>
    ),
  },
]);
