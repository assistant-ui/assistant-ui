"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { lastUserText, streamWords, wait } from "../script";
import { Gemini, adapters } from "./gemini";

const THINKING = [
  "Reading the request and what is attached to it.",
  "This preview answers from a script, so the reply describes the clone instead of the question.",
];

function quote(text: string) {
  return text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
}

function replyFor(asked: string, custom: Record<string, unknown>) {
  const tool = typeof custom["tool"] === "string" ? custom["tool"] : null;
  const opener =
    custom["mode"] === "task"
      ? `Here is how this task would go. The preview answers from a script, so nothing was done for “${quote(asked)}”.`
      : `This is the Gemini clone answering from a script, so no model read “${quote(asked)}”.`;

  return `${opener}${tool ? `\n\nThe **${tool}** chip rode along in the run config, so a real route could read it.` : ""}

What works here:

- **Chats** in the sidebar, with pin, rename, mark as unread, and delete
- **Temporary chat**, which keeps a chat out of the list
- **Attachments** from the + menu, and **@** for mentions
- **Dictation**, **Listen**, ratings, copy, and redo under each reply
- **Theme** under Settings, set to System, Light, or Dark`;
}

const script: ChatModelAdapter = {
  async *run({ messages, abortSignal, runConfig }) {
    const asked = lastUserText(messages) || "your message";
    let thinking = "";
    for (const step of THINKING) {
      await wait(450);
      if (abortSignal.aborted) return;
      thinking += `${thinking ? "\n\n" : ""}${step}`;
      yield { content: [{ type: "reasoning", text: thinking }] };
    }
    const reasoning = { type: "reasoning", text: thinking } as const;
    for await (const text of streamWords(
      replyFor(asked, runConfig?.custom ?? {}),
      abortSignal,
    )) {
      yield { content: [reasoning, { type: "text", text }] };
    }
  },
};

/** The Gemini clone from its file, on a scripted runtime instead of `useChatRuntime`. */
export function GeminiPreview() {
  const runtime = useLocalRuntime(script, { adapters });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Gemini />
    </AssistantRuntimeProvider>
  );
}
