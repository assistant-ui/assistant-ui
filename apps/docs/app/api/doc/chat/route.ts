import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import z from "zod";
import { searchDocs } from "@/lib/vector";

export const maxDuration = 30;

const isDev = process.env.NODE_ENV === "development";

const getRatelimit = async () => {
  if (isDev) return null;
  const { kv } = await import("@vercel/kv");
  const { Ratelimit } = await import("@upstash/ratelimit");
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.fixedWindow(5, "30s"),
  });
};

const ratelimitPromise = getRatelimit();

const SYSTEM_PROMPT = `You are assistant-ui docs assistant.

## Docs Structure
- /docs/ui/* - UI Components (Thread, AssistantModal, etc.)
- /docs/runtimes/* - Runtimes (AI SDK, LangGraph, Custom)
- /docs/(reference)/* - API Reference

## Rules
1. Answer based on provided context
2. Use searchDocs tool if need more info
3. Cite URLs when referencing docs
4. Say "I don't know" if unsure

## Context:
`;

type Message = {
  role: string;
  content: string | { type: string; text?: string }[];
};

function extractUserQuery(messages: Message[]): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg?.content) return "";

  if (typeof lastUserMsg.content === "string") {
    return lastUserMsg.content;
  }

  const textPart = lastUserMsg.content.find((p) => p.type === "text");
  return textPart?.text ?? "";
}

async function fetchContext(query: string): Promise<string> {
  if (!query) return "(No context)";

  const results = await searchDocs(query, 3);
  if (results.length === 0) return "(No context)";

  return results
    .map(
      (r) =>
        `### ${r.metadata?.title}\nURL: ${r.metadata?.url}\n${r.metadata?.content}`,
    )
    .join("\n\n---\n\n");
}

export async function POST(req: Request): Promise<Response> {
  const { messages, tools } = await req.json();

  const ratelimit = await ratelimitPromise;
  if (ratelimit) {
    const ip = req.headers.get("x-forwarded-for") ?? "ip";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }
  }

  const query = extractUserQuery(messages);
  const context = await fetchContext(query).catch((e) => {
    console.error("Pre-retrieval failed:", e);
    return "(No context)";
  });

  const result = streamText({
    model: openai("gpt-5-nano"),
    system: SYSTEM_PROMPT + context,
    messages: convertToModelMessages(messages),
    maxOutputTokens: 1200,
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(tools),
      searchDocs: tool({
        description: "Search assistant-ui documentation",
        inputSchema: z.object({
          query: z.string().describe("Search query"),
        }),
        execute: async ({ query }) => {
          const results = await searchDocs(query, 5);
          return results.map((r) => ({
            title: r.metadata?.title,
            url: r.metadata?.url,
            content: r.metadata?.content,
          }));
        },
      }),
    },
    onError: console.error,
  });

  return result.toUIMessageStreamResponse();
}
