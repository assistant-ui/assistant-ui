"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { lastUserText, streamWords, wait } from "./script";

function quote(text: string) {
  return text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
}

/** One reply for anything: says it is scripted and what on screen comes from the clone's file. */
function scriptFor(name: string): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const reply = `This is the ${name} clone, answering from a script, so no model read “${quote(lastUserText(messages))}”.

Everything around this reply comes from the clone's own file: the composer, the actions under each message, and the sidebar, all built on assistant-ui's primitives.`;
      await wait(350);
      for await (const text of streamWords(reply, abortSignal)) {
        yield { content: [{ type: "text", text }] };
      }
    },
  };
}

/** A clone's UI from its file, on a scripted runtime instead of `useChatRuntime` and the route. */
export function ScriptedClone({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const adapter = useMemo(() => scriptFor(name), [name]);
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
