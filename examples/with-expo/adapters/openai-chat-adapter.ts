import type { ChatModelAdapter } from "@assistant-ui/react-native";

export type OpenAIModelConfig = {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /** Custom fetch implementation — pass `fetch` from `expo/fetch` for streaming support */
  fetch?: typeof globalThis.fetch;
};

type OpenAIMessage = {
  role: string;
  content: string | null;
  tool_calls?: {
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

type ToolCallAccumulator = Record<
  number,
  { id: string; name: string; arguments: string }
>;

export function createOpenAIChatModelAdapter(
  config: OpenAIModelConfig,
): ChatModelAdapter {
  const {
    apiKey,
    model = "gpt-4o-mini",
    baseURL = "https://api.openai.com/v1",
    fetch: customFetch = globalThis.fetch,
  } = config;

  const callOpenAI = async (
    messages: OpenAIMessage[],
    openAITools: any[] | undefined,
    abortSignal: AbortSignal,
  ) => {
    const response = await customFetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(openAITools ? { tools: openAITools } : {}),
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI API error: ${response.status} ${body}`);
    }

    return response;
  };

  const streamResponse = async function* (
    response: Response,
    onUpdate: (text: string, toolCalls: ToolCallAccumulator) => any,
  ) {
    const reader = response.body?.getReader();
    if (!reader) {
      const json = await response.json();
      const choice = json.choices?.[0]?.message;
      return {
        text: (choice?.content as string) ?? "",
        toolCalls: {} as ToolCallAccumulator,
        rawToolCalls: choice?.tool_calls,
      };
    }

    const decoder = new TextDecoder();
    let fullText = "";
    const toolCalls: ToolCallAccumulator = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const delta = JSON.parse(data).choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) fullText += delta.content;
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = {
                    id: tc.id ?? "",
                    name: tc.function?.name ?? "",
                    arguments: "",
                  };
                }
                if (tc.id) toolCalls[tc.index].id = tc.id;
                if (tc.function?.name)
                  toolCalls[tc.index].name = tc.function.name;
                if (tc.function?.arguments)
                  toolCalls[tc.index].arguments += tc.function.arguments;
              }
            }

            yield* onUpdate(fullText, toolCalls);
          } catch {
            // skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { text: fullText, toolCalls };
  };

  return {
    async *run({ messages, context, abortSignal }) {
      const tools = context.tools;

      // Convert messages to OpenAI format
      const openAIMessages: OpenAIMessage[] = messages
        .filter((m) => m.role !== "system")
        .flatMap((m) => {
          if (m.role === "user") {
            const text = m.content
              .filter((p) => p.type === "text")
              .map((p) => ("text" in p ? p.text : ""))
              .join("\n");
            return [{ role: "user", content: text }];
          }
          if (m.role === "assistant") {
            const result: OpenAIMessage[] = [];
            const textParts = m.content.filter((p) => p.type === "text");
            const toolCallParts = m.content.filter(
              (p) => p.type === "tool-call",
            );

            if (toolCallParts.length > 0) {
              result.push({
                role: "assistant",
                content:
                  textParts.length > 0
                    ? textParts
                        .map((p) => ("text" in p ? p.text : ""))
                        .join("\n")
                    : null,
                tool_calls: toolCallParts.map((p: any) => ({
                  id: p.toolCallId,
                  type: "function",
                  function: {
                    name: p.toolName,
                    arguments: JSON.stringify(p.args),
                  },
                })),
              });
              for (const tc of toolCallParts) {
                if ((tc as any).result !== undefined) {
                  result.push({
                    role: "tool",
                    content: JSON.stringify((tc as any).result),
                    tool_call_id: (tc as any).toolCallId,
                  });
                }
              }
            } else if (textParts.length > 0) {
              result.push({
                role: "assistant",
                content: textParts
                  .map((p) => ("text" in p ? p.text : ""))
                  .join("\n"),
              });
            }

            return result;
          }
          return [];
        });

      const openAITools =
        tools && Object.keys(tools).length > 0
          ? Object.entries(tools).map(([name, t]) => ({
              type: "function" as const,
              function: {
                name,
                description: (t as any).description ?? "",
                parameters: (t as any).parameters ?? {},
              },
            }))
          : undefined;

      // Tool execution loop — keep calling OpenAI until we get a text response
      const maxToolRounds = 5;
      const priorParts: any[] = []; // accumulate tool-call parts across rounds

      for (let round = 0; round <= maxToolRounds; round++) {
        const response = await callOpenAI(
          openAIMessages,
          openAITools,
          abortSignal,
        );

        let lastText = "";
        const gen = streamResponse(response, function* (text, toolCalls) {
          lastText = text;
          const content: any[] = [...priorParts];
          if (text) content.push({ type: "text" as const, text });
          for (const tc of Object.values(toolCalls)) {
            let args = {};
            try {
              args = JSON.parse(tc.arguments);
            } catch {
              // still streaming
            }
            content.push({
              type: "tool-call" as const,
              toolCallId: tc.id,
              toolName: tc.name,
              args,
            });
          }
          if (content.length > 0) yield { content };
        });

        // Consume the stream
        let streamResult: any;
        while (true) {
          const { value, done } = await gen.next();
          if (done) {
            streamResult = value;
            break;
          }
          yield value;
        }

        const { toolCalls } = (streamResult as {
          toolCalls: ToolCallAccumulator;
        }) ?? { toolCalls: {} };
        const pendingToolCalls = Object.values(toolCalls) as {
          id: string;
          name: string;
          arguments: string;
        }[];

        // No tool calls — done
        if (pendingToolCalls.length === 0) break;

        // Execute tools and add results to messages for next round
        openAIMessages.push({
          role: "assistant",
          content: lastText || null,
          tool_calls: pendingToolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        const executedToolCalls: any[] = [];
        for (const tc of pendingToolCalls) {
          const args = JSON.parse(tc.arguments);
          const toolDef = tools?.[tc.name];
          let result: any;
          if (toolDef?.execute) {
            result = await (toolDef as any).execute(args);
          }

          executedToolCalls.push({
            type: "tool-call" as const,
            toolCallId: tc.id,
            toolName: tc.name,
            args,
            result,
          });

          // Yield with all prior parts + executed tool calls so far
          yield { content: [...priorParts, ...executedToolCalls] };

          openAIMessages.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: tc.id,
          });
        }

        // Add executed tool calls to prior parts for next round
        priorParts.push(...executedToolCalls);

        // Next iteration will call OpenAI with tool results
      }
    },
  };
}
