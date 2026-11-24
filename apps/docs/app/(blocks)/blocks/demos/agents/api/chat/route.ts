import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { AISDKToolkit, type FrontendTools } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import data from "../../data.json";
import toolkit from "../../toolkit";

export const maxDuration = 60;

const aiToolkit = new AISDKToolkit({ toolkit });

const SYSTEM = `You help one person set up an AI agent: a model with instructions, connectors and tools that carries out a job on its own.

The agent they have open is added below as JSON, or null when there is none; always work from it.

- When they describe a job and no agent is open, call create_agent. Make sensible choices and let them correct you; ask one short question only when the job cannot be told at all.
- Name the agent in two to four words, with a capital on the first word only.
- Write the instructions to the agent as "You": its role in one sentence, then numbered steps for the job, then a short paragraph on the standard its work must meet. Be specific to the job, in 120 to 250 words.
- Connectors: ${data.connectors.map((entry) => `${entry.name} (${entry.title})`).join(", ")}. Give the agent only the ones the job needs, and none when it needs none.
- Tools: ${data.tools.map((entry) => entry.name).join(", ")}. Give every agent bash, read, write, edit, glob and grep unless they say otherwise, and add web_search and web_fetch only when the job needs the open web.
- Skills let the agent write a kind of file: ${data.skills.map((entry) => `${entry.id} (${entry.title})`).join(", ")}.
- Models: ${data.models.map((entry) => entry.id).join(", ")}. Use claude-sonnet-5-5 unless they name another or the job is long and hard (claude-opus-5-5) or short and simple (claude-haiku-5-5).
- Set a schedule only when they say when the agent should run, in the time zone given below. Leave it null otherwise.
- To change the open agent, call update_agent with only the fields that change. A list replaces the list it names, so send the whole new list. A message with an agent open is about that agent unless they ask for a new one.
- After a tool call, answer in one short sentence that says what is now set and anything they must do, such as connect an account. Never list the fields back.`;

const bodySchema = z.object({
  messages: z.array(
    z.looseObject({ role: z.string(), parts: z.array(z.unknown()) }),
  ),
  system: z.string().max(16000).optional(),
  tools: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  // Any route file under app/ is a public endpoint on the site that serves it, so this one stays off unless switched on.
  if (process.env["BLOCKS_LIVE_API"] !== "true") {
    return new Response(
      'The assistant is switched off here. Set BLOCKS_LIVE_API to "true" to turn it on.',
      { status: 404 },
    );
  }
  if (!process.env["OPENAI_API_KEY"]) {
    return new Response(
      "No model key is set. Copy .env.example to .env.local and add one.",
      { status: 401 },
    );
  }
  const body = bodySchema.safeParse(await req.json().catch(() => undefined));
  if (!body.success) {
    return new Response("The request body is not a chat request.", {
      status: 400,
    });
  }

  const messages = body.data.messages as unknown as UIMessage[];
  const frontend = body.data.tools as FrontendTools | undefined;
  const tools = await aiToolkit.tools(frontend ? { frontend } : {});
  const result = streamText({
    abortSignal: req.signal,
    model: openai(data.builder),
    system: body.data.system ? `${SYSTEM}\n\n${body.data.system}` : SYSTEM,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(4),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error ? error.message : "The model request failed.",
    }),
  });
}
