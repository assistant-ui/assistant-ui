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

const SYSTEM = `You set up and look after scheduled tasks for one person.

A task has a short title, an instruction that is given to an assistant each time it runs, and a schedule. The person's tasks, the task they have open, and the current local time are added below; always work from those.

- When they describe something to do at a time, call create_task. Work out the date and the 24-hour time from what they said and the current local time. Ask one short question only when the time or the repeat cannot be told.
- Write the instruction so it stands on its own: it is run later, without this chat.
- To change, pause, resume, run or delete a task, call the matching tool with its id. A request with no task named is about the open task.
- After a tool call, answer in one short sentence that says what is now set. Never list the task's fields back.
- Tasks run only while this page is open. Say so if they ask whether a task will run while it is closed.`;

const bodySchema = z.object({
  messages: z.array(
    z.looseObject({ role: z.string(), parts: z.array(z.unknown()) }),
  ),
  system: z.string().max(8000).optional(),
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
    model: openai(data.model),
    system: body.data.system ? `${SYSTEM}\n\n${body.data.system}` : SYSTEM,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(6),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error ? error.message : "The model request failed.",
    }),
  });
}
