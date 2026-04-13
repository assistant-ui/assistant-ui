import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import { checkRateLimit } from "@/lib/integrations/rate-limit/upstash";
import {
  retrieveRelevantDocs,
  formatDocsForPrompt,
} from "@/lib/workbench/sdk-guide/retrieve-docs";

export const runtime = "edge";

interface WorkbenchContext {
  selectedComponent: string;
  displayMode: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
  recentConsoleLogs: Array<{
    type: string;
    method: string;
    args?: unknown;
    result?: unknown;
    timestamp: string;
  }>;
}

function buildSystemPrompt(
  relevantDocs: string,
  context: WorkbenchContext,
): string {
  return `You are SDK Guide, an assistant that helps developers build ChatGPT Apps using the OpenAI Apps SDK.

## Your Role
- Answer questions about the ChatGPT Apps SDK
- Help debug configuration issues
- Explain SDK concepts with practical examples
- Reference specific documentation when answering

## Scope
ONLY answer questions about the ChatGPT Apps SDK. For unrelated topics, politely redirect by saying something like "I'm focused on helping with the ChatGPT Apps SDK. For that question, you might want to check [relevant resource]."

## Current Workbench Context
The user is working in a Tool UI workbench with the following state:
- Component: ${context.selectedComponent || "none loaded"}
- Display mode: ${context.displayMode}
- Has tool input: ${!!context.toolInput && Object.keys(context.toolInput).length > 0}
- Has tool output: ${!!context.toolOutput}
- Has widget state: ${!!context.widgetState}

## Available Tools
You have tools to:
1. \`inspect_workbench\` - Get the user's current configuration (tool input, output, widget state)
2. \`get_console_logs\` - See recent SDK method calls
3. \`validate_config\` - Check for common configuration issues

Use these tools proactively when debugging or when the user asks about their setup.

## Relevant Documentation
${relevantDocs || "No specific documentation retrieved for this query."}

## Guidelines
1. Be direct and practical—developers value their time
2. When referencing docs, mention the source (e.g., "According to the Reference docs...")
3. Use the inspect tools to ground your answers in the user's actual configuration
4. For configuration issues, explain both what's wrong AND how to fix it
5. Keep responses concise but complete`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          reset: rateLimitResult.reset,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        },
      );
    }

    const { messages, workbenchContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const context: WorkbenchContext = workbenchContext || {
      selectedComponent: "unknown",
      displayMode: "inline",
      toolInput: {},
      toolOutput: null,
      widgetState: null,
      recentConsoleLogs: [],
    };

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const query =
      typeof lastUserMessage?.content === "string"
        ? lastUserMessage.content
        : "";

    const relevantDocs = retrieveRelevantDocs(query, 5);
    const formattedDocs = formatDocsForPrompt(relevantDocs);

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: modelMessages,
      system: buildSystemPrompt(formattedDocs, context),
      tools: {
        inspect_workbench: {
          description:
            "Get the current workbench configuration including the selected component, tool input/output, and widget state. Use this to understand what the user is working on.",
          inputSchema: z.object({
            include: z
              .array(
                z.enum([
                  "component",
                  "toolInput",
                  "toolOutput",
                  "widgetState",
                  "displayMode",
                ]),
              )
              .optional()
              .describe(
                "Which parts of the configuration to include. Defaults to all.",
              ),
          }),
          execute: async ({ include }) => {
            const includeSet = new Set(
              include || [
                "component",
                "toolInput",
                "toolOutput",
                "widgetState",
                "displayMode",
              ],
            );

            const config: Record<string, unknown> = {};

            if (includeSet.has("component")) {
              config.component = context.selectedComponent;
            }
            if (includeSet.has("displayMode")) {
              config.displayMode = context.displayMode;
            }
            if (includeSet.has("toolInput")) {
              config.toolInput = context.toolInput;
            }
            if (includeSet.has("toolOutput")) {
              config.toolOutput = context.toolOutput;
            }
            if (includeSet.has("widgetState")) {
              config.widgetState = context.widgetState;
            }

            return config;
          },
        },

        get_console_logs: {
          description:
            "Retrieve recent SDK method calls from the console. Useful for debugging and understanding what interactions have occurred.",
          inputSchema: z.object({
            limit: z
              .number()
              .optional()
              .default(10)
              .describe("Maximum number of log entries to return"),
            method: z
              .string()
              .optional()
              .describe(
                "Filter by method name (e.g., 'callTool', 'setWidgetState')",
              ),
          }),
          execute: async ({ limit, method }) => {
            let logs = context.recentConsoleLogs || [];

            if (method) {
              logs = logs.filter((log) => log.method === method);
            }

            return {
              logs: logs.slice(0, limit),
              totalCount: context.recentConsoleLogs?.length || 0,
            };
          },
        },

        validate_config: {
          description:
            "Check the current tool configuration for common issues and provide recommendations. Use this to help users debug configuration problems.",
          inputSchema: z.object({
            configType: z
              .enum(["tool_descriptor", "tool_result", "widget_state"])
              .describe("The type of configuration to validate"),
          }),
          execute: async ({ configType }) => {
            const issues: Array<{
              severity: "error" | "warning" | "info";
              field: string;
              message: string;
              suggestion?: string;
            }> = [];

            const input = context.toolInput || {};

            if (configType === "tool_descriptor") {
              const meta = (input._meta || {}) as Record<string, unknown>;

              if (!meta["openai/outputTemplate"]) {
                issues.push({
                  severity: "error",
                  field: '_meta["openai/outputTemplate"]',
                  message:
                    "Missing output template URI. Your component won't render without this.",
                  suggestion:
                    'Add a _meta["openai/outputTemplate"] field pointing to your component HTML resource URI.',
                });
              }

              if (
                meta["openai/visibility"] === "private" &&
                !meta["openai/widgetAccessible"]
              ) {
                issues.push({
                  severity: "warning",
                  field: '_meta["openai/widgetAccessible"]',
                  message:
                    "Tool is private but not widget-accessible. Your component won't be able to call this tool.",
                  suggestion:
                    'Set _meta["openai/widgetAccessible"]: true if the component needs to call this tool.',
                });
              }

              const invokingText = meta["openai/toolInvocation/invoking"];
              if (
                typeof invokingText === "string" &&
                invokingText.length > 64
              ) {
                issues.push({
                  severity: "warning",
                  field: '_meta["openai/toolInvocation/invoking"]',
                  message: `Status text is ${invokingText.length} characters. Maximum is 64.`,
                  suggestion:
                    "Shorten the invoking status text to 64 characters or less.",
                });
              }
            }

            if (configType === "tool_result") {
              const output = context.toolOutput || {};

              if (!output.structuredContent && !output.content) {
                issues.push({
                  severity: "warning",
                  field: "structuredContent / content",
                  message:
                    "Tool result has neither structuredContent nor content. The model won't receive any data.",
                  suggestion:
                    "Add structuredContent for data the model should see, or content for transcript text.",
                });
              }
            }

            if (configType === "widget_state") {
              const state = context.widgetState;

              if (state && JSON.stringify(state).length > 16000) {
                issues.push({
                  severity: "warning",
                  field: "widgetState",
                  message:
                    "Widget state is very large. This may impact performance.",
                  suggestion:
                    "Keep widget state under 4k tokens for optimal performance.",
                });
              }
            }

            return {
              valid: issues.filter((i) => i.severity === "error").length === 0,
              issueCount: issues.length,
              issues,
            };
          },
        },
      },
      stopWhen: stepCountIs(5),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in SDK Guide API route:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
