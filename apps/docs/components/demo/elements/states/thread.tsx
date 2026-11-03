"use client";

import type { ThreadMessageLike } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

const QUESTION = "How do I persist a composer draft across reloads?";

/** Shared with the other thread-shell states files (modal, sidebar). */
export const THREAD_FIXTURES = {
  empty: [] as ThreadMessageLike[],
  streaming: [
    { role: "user", content: QUESTION },
    {
      role: "assistant",
      status: { type: "running" },
      content:
        "Drafts live on the composer, so the simplest path is to save `composer.text` whenever it changes and restore it when the thread mounts. With a",
    },
  ] as ThreadMessageLike[],
  error: [
    { role: "user", content: QUESTION },
    {
      role: "assistant",
      status: {
        type: "incomplete",
        reason: "error",
        error:
          "429 Too Many Requests: rate limit reached for gpt-5 on this key.",
      },
      content: "Drafts live on the composer, so",
    },
  ] as ThreadMessageLike[],
  tools: [
    { role: "user", content: "Is the docs search returning the drafts guide?" },
    {
      role: "assistant",
      content: [
        {
          type: "reasoning",
          text: "The user wants to know whether search indexes the drafts guide. I will query for it and check the top hit.",
        },
        {
          type: "tool-call",
          toolCallId: "call_search_1",
          toolName: "search_docs",
          args: { query: "draft persistence", limit: 5 },
          result: {
            matches: 3,
            top: "/docs/runtime/drafts",
          },
        },
        {
          type: "text",
          text: "Yes. Searching for **draft persistence** returns 3 matches, and the top hit is `/docs/runtime/drafts`.",
        },
      ],
    },
  ] as ThreadMessageLike[],
  requiresAction: [
    { role: "user", content: "Clear the build cache and rerun the tests." },
    {
      role: "assistant",
      status: { type: "requires-action", reason: "tool-calls" },
      content: [
        {
          type: "tool-call",
          toolCallId: "call_shell_1",
          toolName: "run_command",
          args: { command: "rm -rf .turbo && pnpm vitest run --changed" },
        },
      ],
    },
  ] as ThreadMessageLike[],
  long: [
    { role: "user", content: QUESTION },
    {
      role: "assistant",
      content: [
        "Save the draft on every change and restore it when the thread mounts.",
        "",
        "```tsx",
        "const aui = useAui();",
        "useEffect(() => {",
        "  const saved = localStorage.getItem(`draft:${threadId}`);",
        "  if (saved) aui.composer.setText(saved);",
        "}, [aui, threadId]);",
        "```",
        "",
        "Key the storage entry by thread id so switching threads does not leak a draft into the wrong conversation.",
      ].join("\n"),
    },
    { role: "user", content: "Does that survive a remote thread list switch?" },
    {
      role: "assistant",
      content:
        "Yes, as long as the effect depends on the thread id. The remote thread list remounts the thread body on a switch, so the effect runs again and reads the entry for the new id.",
    },
    {
      role: "user",
      content:
        "And when the draft has attachments? We upload files to S3 first, then send the message with the returned keys, and I want a reload in the middle of that to keep both the text and the pending uploads.",
    },
    {
      role: "assistant",
      content: [
        "Attachments need their own record, because the composer only holds them in memory.",
        "",
        "1. Store each upload's key and file name next to the draft text.",
        "2. On restore, call `aui.composer.addAttachment` with a completed attachment for each stored key.",
        "3. Drop the record after the message sends, so a later reload starts clean.",
        "",
        "An upload still in flight at reload time has no key yet. Treat it as lost and let the user pick the file again.",
      ].join("\n"),
    },
  ] as ThreadMessageLike[],
} satisfies Record<string, ThreadMessageLike[]>;

function ThreadFixture({ messages }: { messages: ThreadMessageLike[] }) {
  return (
    <SampleRuntimeProvider messages={messages}>
      <div className="bg-muted/40 h-full w-full">
        <Thread autoFocus={false} />
      </div>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty",
    note: "A new thread with no messages shows the welcome and a centered composer.",
    Component: () => <ThreadFixture messages={THREAD_FIXTURES.empty} />,
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "The assistant reply is still arriving.",
    Component: () => <ThreadFixture messages={THREAD_FIXTURES.streaming} />,
  },
  {
    key: "error",
    label: "Error",
    note: "The run failed partway and the message shows the provider error.",
    Component: () => <ThreadFixture messages={THREAD_FIXTURES.error} />,
  },
  {
    key: "tool-calls",
    label: "Tool calls",
    note: "A reply that reasons, calls a tool, and answers from the result.",
    Component: () => <ThreadFixture messages={THREAD_FIXTURES.tools} />,
  },
  {
    key: "requires-action",
    label: "Needs action",
    note: "The run paused on a tool call that has no result yet.",
    Component: () => (
      <ThreadFixture messages={THREAD_FIXTURES.requiresAction} />
    ),
  },
  {
    key: "long-content",
    label: "Long thread",
    note: "Several turns with code and lists scroll inside the viewport.",
    Component: () => <ThreadFixture messages={THREAD_FIXTURES.long} />,
  },
]);
