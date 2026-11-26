import { createServer, type IncomingMessage, type Server } from "node:http";
import { appendFileSync } from "node:fs";
import type { AddressInfo } from "node:net";

/**
 * A scripted stand-in for an LLM, so the eval needs no API key and every
 * reply is predictable enough for a check to assert on.
 *
 * It speaks the OpenAI Chat Completions and Responses APIs (streaming or not)
 * under `/v1`, plus a small non-AI "legacy" endpoint at `/legacy/chat` for the
 * task that connects an existing backend. Every request is recorded, so a
 * check can see what the app actually sent: the model id, the system prompt,
 * images, tool results.
 *
 * Replies, from the last message of the conversation:
 * - a tool result: `Tool result received: <result>`
 * - user text with "flaky": HTTP 500 the first time that exact text is sent
 * - "weather" when a `get_weather` tool is offered: calls it with `{ city: "Paris" }`
 * - "delete" when a `delete_file` tool is offered: calls it with `{ path: "notes.txt" }`
 * - with images: `I received <n> image(s). Echo: <text>`
 * - anything else: `Echo: <text>`
 */

export interface MockMessage {
  role: "user" | "assistant" | "tool";
  text: string;
  images: number;
  toolName?: string | undefined;
}

export interface MockRequest {
  path: string;
  api: "chat" | "responses" | "legacy";
  model: string;
  system: string;
  messages: MockMessage[];
  tools: string[];
  stream: boolean;
}

type Reply =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; args: Record<string, unknown> }
  | { kind: "error"; status: number; message: string };

export interface MockLLM {
  url: string;
  port: number;
  requests: MockRequest[];
  close(): Promise<void>;
}

const asText = (content: unknown): { text: string; images: number } => {
  if (typeof content === "string") return { text: content, images: 0 };
  if (!Array.isArray(content)) return { text: "", images: 0 };
  let text = "";
  let images = 0;
  for (const part of content as Record<string, unknown>[]) {
    const type = String(part?.type ?? "");
    if (type === "text" || type === "input_text" || type === "output_text") {
      text += String(part.text ?? "");
    } else if (
      type === "image_url" ||
      type === "input_image" ||
      (type === "file" &&
        String(
          (part.file as Record<string, unknown> | undefined)?.filename ?? "",
        ).match(/\.(png|jpe?g|gif|webp)$/i))
    ) {
      images++;
    }
  }
  return { text, images };
};

/** Normalizes a Chat Completions body. */
const fromChat = (body: Record<string, unknown>) => {
  const system: string[] = [];
  const messages: MockMessage[] = [];
  const names = new Map<string, string>();
  for (const m of (body.messages ?? []) as Record<string, unknown>[]) {
    const role = String(m.role);
    const { text, images } = asText(m.content);
    if (role === "system" || role === "developer") system.push(text);
    else if (role === "tool") {
      messages.push({
        role: "tool",
        text,
        images: 0,
        toolName: names.get(String(m.tool_call_id)),
      });
    } else {
      for (const call of (m.tool_calls ?? []) as Record<string, any>[]) {
        names.set(String(call.id), String(call.function?.name));
      }
      messages.push({ role: role as "user" | "assistant", text, images });
    }
  }
  const tools = ((body.tools ?? []) as Record<string, any>[]).map((t) =>
    String(t.function?.name ?? t.name),
  );
  return { system: system.join("\n"), messages, tools };
};

/** Normalizes a Responses API body. */
const fromResponses = (body: Record<string, unknown>) => {
  const system: string[] = [];
  if (typeof body.instructions === "string") system.push(body.instructions);
  const messages: MockMessage[] = [];
  const names = new Map<string, string>();
  const input =
    typeof body.input === "string"
      ? [{ role: "user", content: body.input }]
      : ((body.input ?? []) as Record<string, unknown>[]);
  for (const item of input) {
    const type = String(item.type ?? "message");
    if (type === "function_call") {
      names.set(String(item.call_id), String(item.name));
      continue;
    }
    if (type === "function_call_output") {
      const output =
        typeof item.output === "string"
          ? item.output
          : JSON.stringify(item.output);
      messages.push({
        role: "tool",
        text: output,
        images: 0,
        toolName: names.get(String(item.call_id)),
      });
      continue;
    }
    if (type !== "message") continue;
    const role = String(item.role);
    const { text, images } = asText(item.content);
    if (role === "system" || role === "developer") system.push(text);
    else messages.push({ role: role as "user" | "assistant", text, images });
  }
  const tools = ((body.tools ?? []) as Record<string, any>[]).map((t) =>
    String(t.name ?? t.function?.name),
  );
  return { system: system.join("\n"), messages, tools };
};

export function decide(
  req: Pick<MockRequest, "messages" | "tools">,
  seen: Set<string>,
): Reply {
  const last = req.messages.at(-1);
  if (!last) return { kind: "text", text: "Echo: " };
  if (last.role === "tool") {
    return { kind: "text", text: `Tool result received: ${last.text}` };
  }
  const text = last.text.trim();
  const lower = text.toLowerCase();
  if (lower.includes("flaky") && !seen.has(text)) {
    seen.add(text);
    return { kind: "error", status: 500, message: "Mock model failure" };
  }
  if (req.tools.includes("get_weather") && lower.includes("weather")) {
    return { kind: "tool", name: "get_weather", args: { city: "Paris" } };
  }
  if (req.tools.includes("delete_file") && lower.includes("delete")) {
    return { kind: "tool", name: "delete_file", args: { path: "notes.txt" } };
  }
  if (last.images > 0) {
    return {
      kind: "text",
      text: `I received ${last.images} image(s). Echo: ${text}`,
    };
  }
  return { kind: "text", text: `Echo: ${text}` };
}

const chunks = (text: string) => {
  const size = Math.max(1, Math.ceil(text.length / 3));
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [""];
};

const readBody = async (req: IncomingMessage) => {
  const parts: Buffer[] = [];
  for await (const part of req) parts.push(part as Buffer);
  return Buffer.concat(parts).toString("utf8");
};

const USAGE_CHAT = { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 };
const USAGE_RESPONSES = {
  input_tokens: 1,
  output_tokens: 1,
  total_tokens: 2,
  input_tokens_details: { cached_tokens: 0 },
  output_tokens_details: { reasoning_tokens: 0 },
};

/** Starts the mock on `port` (0 picks a free one) and appends each request to `logFile` as JSON lines. */
export async function startMockLLM(
  port = 0,
  logFile?: string,
): Promise<MockLLM> {
  const requests: MockRequest[] = [];
  const seen = new Set<string>();
  let n = 0;

  const server: Server = createServer(async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return void res.end();
    const path = (req.url ?? "/").split("?")[0]!;

    if (req.method === "GET" && path.endsWith("/models")) {
      res.setHeader("content-type", "application/json");
      return void res.end(
        JSON.stringify({
          object: "list",
          data: ["mock-1", "mock-fast", "mock-smart"].map((id) => ({
            id,
            object: "model",
            created: 0,
            owned_by: "mock",
          })),
        }),
      );
    }

    let body: Record<string, any>;
    try {
      body = JSON.parse((await readBody(req)) || "{}");
    } catch {
      res.statusCode = 400;
      return void res.end(JSON.stringify({ error: { message: "Bad JSON" } }));
    }

    const record = (r: MockRequest) => {
      requests.push(r);
      if (logFile) appendFileSync(logFile, `${JSON.stringify(r)}\n`);
    };

    if (path === "/legacy/chat") {
      const list = Array.isArray(body.messages) ? body.messages : null;
      if (!list) {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        return void res.end(
          JSON.stringify({
            error:
              'Expected a JSON body { "messages": [{ "role": "user" | "assistant", "content": string }] }',
          }),
        );
      }
      const messages: MockMessage[] = list.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        text: String(m.content ?? ""),
        images: 0,
      }));
      record({
        path,
        api: "legacy",
        model: "",
        system: "",
        messages,
        tools: [],
        stream: true,
      });
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("cache-control", "no-cache");
      for (const piece of chunks(`Legacy says: ${lastUser?.text ?? ""}`)) {
        res.write(`data: ${JSON.stringify({ text: piece })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      return void res.end();
    }

    const api = path.endsWith("/responses")
      ? "responses"
      : path.endsWith("/chat/completions")
        ? "chat"
        : undefined;
    if (!api || req.method !== "POST") {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      return void res.end(
        JSON.stringify({
          error: {
            message: `The mock model serves POST /v1/chat/completions and POST /v1/responses, not ${req.method} ${path}`,
          },
        }),
      );
    }

    const normalized = api === "chat" ? fromChat(body) : fromResponses(body);
    const model = String(body.model ?? "");
    const stream = body.stream === true;
    record({ path, api, model, stream, ...normalized });

    const reply = decide(normalized, seen);
    const id = `mock-${++n}`;
    const created = Math.floor(Date.now() / 1000);

    if (reply.kind === "error") {
      res.statusCode = reply.status;
      res.setHeader("content-type", "application/json");
      return void res.end(
        JSON.stringify({
          error: { message: reply.message, type: "server_error" },
        }),
      );
    }

    const callId = `call_${n}`;
    const args = reply.kind === "tool" ? JSON.stringify(reply.args) : "";

    if (api === "chat") {
      if (!stream) {
        res.setHeader("content-type", "application/json");
        const message =
          reply.kind === "text"
            ? { role: "assistant", content: reply.text }
            : {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: callId,
                    type: "function",
                    function: { name: reply.name, arguments: args },
                  },
                ],
              };
        return void res.end(
          JSON.stringify({
            id,
            object: "chat.completion",
            created,
            model,
            choices: [
              {
                index: 0,
                message,
                finish_reason: reply.kind === "text" ? "stop" : "tool_calls",
              },
            ],
            usage: USAGE_CHAT,
          }),
        );
      }
      res.setHeader("content-type", "text/event-stream");
      const send = (delta: object, finish: string | null = null) =>
        res.write(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`,
        );
      send({ role: "assistant", content: "" });
      if (reply.kind === "text") {
        for (const piece of chunks(reply.text)) send({ content: piece });
        send({}, "stop");
      } else {
        send({
          tool_calls: [
            {
              index: 0,
              id: callId,
              type: "function",
              function: { name: reply.name, arguments: args },
            },
          ],
        });
        send({}, "tool_calls");
      }
      res.write(
        `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model, choices: [], usage: USAGE_CHAT })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      return void res.end();
    }

    // Responses API
    const itemId = `item_${n}`;
    const outputItem =
      reply.kind === "text"
        ? {
            type: "message",
            id: itemId,
            role: "assistant",
            status: "completed",
            content: [
              { type: "output_text", text: reply.text, annotations: [] },
            ],
          }
        : {
            type: "function_call",
            id: itemId,
            call_id: callId,
            name: reply.name,
            arguments: args,
            status: "completed",
          };
    const response = {
      id,
      object: "response",
      created_at: created,
      model,
      status: "completed",
      output: [outputItem],
      usage: USAGE_RESPONSES,
    };
    if (!stream) {
      res.setHeader("content-type", "application/json");
      return void res.end(JSON.stringify(response));
    }
    res.setHeader("content-type", "text/event-stream");
    let seq = 0;
    const emit = (event: Record<string, unknown>) =>
      res.write(
        `event: ${event.type}\ndata: ${JSON.stringify({ ...event, sequence_number: seq++ })}\n\n`,
      );
    emit({
      type: "response.created",
      response: { ...response, status: "in_progress", output: [] },
    });
    if (reply.kind === "text") {
      emit({
        type: "response.output_item.added",
        output_index: 0,
        item: { ...outputItem, status: "in_progress", content: [] },
      });
      for (const piece of chunks(reply.text)) {
        emit({
          type: "response.output_text.delta",
          item_id: itemId,
          output_index: 0,
          content_index: 0,
          delta: piece,
        });
      }
      emit({
        type: "response.output_text.done",
        item_id: itemId,
        output_index: 0,
        content_index: 0,
        text: reply.text,
      });
    } else {
      emit({
        type: "response.output_item.added",
        output_index: 0,
        item: { ...outputItem, arguments: "", status: "in_progress" },
      });
      emit({
        type: "response.function_call_arguments.delta",
        item_id: itemId,
        output_index: 0,
        delta: args,
      });
      emit({
        type: "response.function_call_arguments.done",
        item_id: itemId,
        output_index: 0,
        arguments: args,
      });
    }
    emit({
      type: "response.output_item.done",
      output_index: 0,
      item: outputItem,
    });
    emit({ type: "response.completed", response });
    res.end();
  });

  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve()),
  );
  const actual = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${actual}`,
    port: actual,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
