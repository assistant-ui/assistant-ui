import { CheckFailure, type Driver } from "./browser.ts";
import type { MockLLM, MockRequest } from "./mock-llm.ts";

/**
 * One thing a developer asks their coding agent to build with assistant-ui.
 * The set follows what people ask the docs assistant and search the docs for
 * most (thread history, tools and approval, custom backends, attachments,
 * model choice, context, errors), written in our own words.
 */
export interface AgentTask {
  id: string;
  description: string;
  /** The request, as the developer would write it. `mock` is the mock model's base URL. */
  prompt(mock: string): string;
  /** Drives the built app in a browser; throws `CheckFailure` naming the step that failed. */
  check(page: Driver, mock: MockLLM): Promise<void>;
}

const llmRequests = (mock: MockLLM) =>
  mock.requests.filter((r) => r.api !== "legacy");

const expect = (ok: boolean, step: string, detail: string) => {
  if (!ok) throw new CheckFailure(step, detail);
};

const lastUser = (r: MockRequest) =>
  [...r.messages].reverse().find((m) => m.role === "user");

export const tasks: AgentTask[] = [
  {
    id: "chat-basic",
    description: "A streaming chat page backed by an OpenAI-compatible model",
    prompt: () =>
      "Build a chat page: the user types a message and sees the assistant's reply stream in. Use the model server described above, through a Next.js API route.",
    async check(page, mock) {
      await page.send("Hello there");
      await page.waitForText("Echo: Hello there");
      expect(
        llmRequests(mock).length > 0,
        "calls the model",
        "the reply appeared without a model request",
      );
    },
  },
  {
    id: "thread-history",
    description:
      "A thread list whose threads and messages survive a reload, stored by the app",
    prompt: () =>
      [
        "Build a chat app with a sidebar listing the user's conversations (threads).",
        '- A "New chat" button starts a new thread; clicking a thread in the sidebar opens it.',
        "- Each thread in the sidebar is titled with the first message the user sent in it.",
        "- Threads and their messages must survive a full page reload. Store them in the browser (localStorage) or in your own Next.js API routes (a JSON file or in-memory store is fine). Don't use a hosted service.",
      ].join("\n"),
    async check(page) {
      await page.send("First thread note");
      await page.waitForText("Echo: First thread note");
      await page.clickText(
        "^\\+?\\s*new (chat|thread)$",
        'has a "New chat" button',
      );
      await page.send("Second thread note");
      await page.waitForText("Echo: Second thread note");
      await page.reload();
      await page.clickText(
        "^First thread note$",
        "lists the first thread by its title after a reload",
      );
      await page.waitForText("Echo: First thread note", 15_000);
      await page.clickText(
        "^Second thread note$",
        "lists the second thread by its title after a reload",
      );
      await page.waitForText("Echo: Second thread note", 15_000);
    },
  },
  {
    id: "tool-approval",
    description:
      "A backend tool that waits for the user's approval before it runs",
    prompt: () =>
      [
        "Add a tool the assistant can call: `delete_file`, with one string parameter `path`. It runs on the server and returns `{ deleted: path }` (don't touch the real file system).",
        '- Before the tool runs, the chat shows an approval card naming the file, with an "Approve" button and a "Reject" button.',
        "- The tool only runs after the user clicks Approve. After it runs, the assistant continues and its reply shows in the chat.",
        '- To test: the mock model calls `delete_file` with `{ "path": "notes.txt" }` when the user\'s message contains "delete", and once it gets the tool result it replies "Tool result received: <result>".',
      ].join("\n"),
    async check(page, mock) {
      await page.send("Please delete notes.txt");
      await page.waitForText("Approve");
      await page.waitForText("notes.txt");
      const ranEarly = llmRequests(mock).some((r) =>
        r.messages.some((m) => m.role === "tool"),
      );
      expect(
        !ranEarly,
        "waits for approval",
        "the tool result reached the model before anyone clicked Approve",
      );
      await page.clickText("^approve$", 'has an "Approve" button');
      await page.waitForText("Tool result received", 20_000);
      const result = llmRequests(mock)
        .flatMap((r) => r.messages)
        .find((m) => m.role === "tool");
      expect(
        !!result && result.text.includes("notes.txt"),
        "runs the tool after approval",
        "no tool result naming notes.txt reached the model",
      );
    },
  },
  {
    id: "tool-ui",
    description: "A tool call rendered as a custom card instead of raw JSON",
    prompt: () =>
      [
        "Add a weather tool and show its result as a card in the chat.",
        '- The tool is `get_weather` with one string parameter `city`. It runs on the server and returns `{ city, temperatureC: 18, condition: "Sunny" }` for any city (no real weather API).',
        '- In the chat, a `get_weather` call renders as a card with the text "<city>: <temperatureC>°C, <condition>", for example "Paris: 18°C, Sunny". Show a loading state while the tool runs.',
        '- To test: the mock model calls `get_weather` with `{ "city": "Paris" }` when the user\'s message contains "weather".',
      ].join("\n"),
    async check(page) {
      await page.send("What's the weather in Paris?");
      await page.waitForText("Paris: 18°C, Sunny", 25_000);
    },
  },
  {
    id: "custom-backend",
    description:
      "assistant-ui on top of an existing non-AI-SDK streaming backend",
    prompt: (mock) =>
      [
        `We already have a chat backend; connect assistant-ui to it instead of calling a model yourself. It runs at ${mock}/legacy/chat.`,
        '- Request: `POST` with JSON `{ "messages": [{ "role": "user" | "assistant", "content": string }] }` holding the whole conversation so far.',
        '- Response: server-sent events. Each event is `data: {"text": "<next chunk>"}`; the stream ends with `data: [DONE]`.',
        '- Stream the reply into the chat as it arrives. The backend answers "Legacy says: <last user message>". Don\'t add an AI SDK route; the browser or your own thin proxy talks to this backend.',
      ].join("\n"),
    async check(page, mock) {
      await page.send("ping one");
      await page.waitForText("Legacy says: ping one");
      await page.send("ping two");
      await page.waitForText("Legacy says: ping two");
      const legacy = mock.requests.filter((r) => r.api === "legacy");
      const last = legacy.at(-1);
      expect(
        !!last &&
          last.messages.some((m) => m.text === "ping one") &&
          last.messages.some((m) => m.text.includes("Legacy says: ping one")),
        "sends the whole conversation",
        "the second request did not carry the first exchange",
      );
    },
  },
  {
    id: "suggestions",
    description: "Starter suggestions on the empty chat that send on click",
    prompt: () =>
      [
        'Build a chat page whose empty state shows three suggestion buttons: "Plan a trip", "Write a poem" and "Explain React".',
        "- Clicking a suggestion sends it right away as the user's message.",
      ].join("\n"),
    async check(page) {
      await page.waitForText("Plan a trip");
      await page.waitForText("Explain React");
      await page.clickText("^write a poem$", 'has a "Write a poem" suggestion');
      await page.waitForText("Echo: Write a poem");
    },
  },
  {
    id: "attachments",
    description: "Image attachments in the composer that reach the model",
    prompt: () =>
      [
        "Build a chat page where the user can attach images (PNG or JPEG) to a message from the composer, see them in the message, and send them to the model along with the text.",
        '- To test: the mock model replies "I received <n> image(s). Echo: <text>" when the last user message carries images.',
      ].join("\n"),
    async check(page, mock) {
      await page.attachImage("has a file input for attachments");
      await page.send("Describe this image");
      await page.waitForText("I received 1 image(s)", 20_000);
      const withImage = llmRequests(mock).some(
        (r) => (lastUser(r)?.images ?? 0) > 0,
      );
      expect(
        withImage,
        "sends the image to the model",
        "no image in the request",
      );
    },
  },
  {
    id: "model-picker",
    description: "A model picker whose choice reaches the backend",
    prompt: () =>
      [
        'Add a model picker to the chat: a dropdown with "mock-fast" (the default) and "mock-smart".',
        "- The selected model is used for the next message: the backend must call the model server with that model id.",
        "- Both ids are served by the mock model server described above.",
      ].join("\n"),
    async check(page, mock) {
      await page.waitForText("mock-fast");
      await page.choose(
        "mock-fast",
        "mock-smart",
        "lets the user pick mock-smart",
      );
      await page.send("Which model is this?");
      await page.waitForText("Echo: Which model is this?");
      const req = llmRequests(mock)
        .filter((r) => lastUser(r)?.text.includes("Which model is this?"))
        .at(-1);
      expect(
        req?.model === "mock-smart",
        "uses the picked model",
        `the model server was called with "${req?.model}"`,
      );
    },
  },
  {
    id: "frontend-context",
    description:
      "Page state from the frontend passed to the model as system instructions",
    prompt: () =>
      [
        'Above the chat, add a text field labelled "Your name". Whenever the user sends a message, the model must be told the current value as part of its system instructions, e.g. "The user\'s name is Ada."',
        "- Changing the field affects the next message without a reload.",
      ].join("\n"),
    async check(page, mock) {
      await page.fill("your name", "Ada Lovelace", 'has a "Your name" field');
      await page.send("Who am I?");
      await page.waitForText("Echo: Who am I?");
      const system = (text: string) =>
        llmRequests(mock)
          .filter((r) => lastUser(r)?.text.includes(text))
          .at(-1)?.system ?? "";
      expect(
        system("Who am I?").includes("Ada Lovelace"),
        "passes the name as instructions",
        "the system prompt didn't mention Ada Lovelace",
      );
      await page.fill("your name", "Grace Hopper", 'has a "Your name" field');
      await page.send("And now?");
      await page.waitForText("Echo: And now?");
      expect(
        system("And now?").includes("Grace Hopper"),
        "updates the instructions",
        "the system prompt didn't follow the field's new value",
      );
    },
  },
  {
    id: "error-retry",
    description:
      "A failed reply shows an error in the thread with a Retry button",
    prompt: () =>
      [
        'When the model request fails, show an error in the chat thread containing the text "Something went wrong" and a "Retry" button that asks for the reply again.',
        '- To test: the mock model returns HTTP 500 the first time it sees a given message containing "flaky", and replies normally ("Echo: <text>") after that.',
      ].join("\n"),
    async check(page) {
      await page.send("This is flaky");
      await page.waitForText("Something went wrong", 20_000);
      await page.clickText("^retry$", 'has a "Retry" button');
      await page.waitForText("Echo: This is flaky", 20_000);
    },
  },
];
