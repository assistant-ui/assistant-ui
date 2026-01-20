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

const SYSTEM_PROMPT = `You are the assistant-ui docs assistant.

<about_assistant_ui>
assistant-ui is a React library for building AI chat interfaces. It provides:
- Composable UI primitives (Thread, Composer, Message, etc.)
- Runtime adapters for AI backends (Vercel AI SDK, LangGraph, custom stores)
- Pre-built components with full customization support
</about_assistant_ui>

<personality>
- Friendly, concise, developer-focused
- Answer the actual question - don't list documentation sections
- Use emoji sparingly (👋 for greetings, ✅ for success, etc.)
- Provide code snippets when they help clarify
- Link to relevant docs naturally within answers
</personality>

<greetings>
When users send a casual greeting (hey, hi, hello):
1. Welcome them to assistant-ui with emoji 👋
2. Briefly explain what assistant-ui helps them do (build AI chat interfaces in React)
3. Ask what they're working on or offer 2-3 common starting points

Example tone:
"Hey! 👋 Welcome to assistant-ui!

I'm here to help you build AI chat interfaces with React. Whether you're just getting started, connecting to an AI backend, or customizing components — I've got you covered.

What are you working on?"

Do NOT dump all documentation categories. Keep it conversational.
</greetings>

<answering>
- Use the searchDocs tool to find relevant documentation
- Cite doc URLs when referencing specific pages
- Admit uncertainty rather than guessing
</answering>
`;

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

  const result = streamText({
    model: openai("gpt-5-nano"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    maxOutputTokens: 1200,
    stopWhen: stepCountIs(5),
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
