import type { ThreadMessageLike } from "@assistant-ui/react";

const SEED_COUNT = 500;

const SNIPPETS = [
  "Virtualization keeps the DOM small by only mounting the messages near the viewport. Everything else is represented by empty space, so scrolling through thousands of messages stays cheap.",
  "Here is a list of things to keep in mind:\n\n- only mount what is visible\n- measure real heights after mount\n- keep React keys stable across index shifts",
  "```ts\nconst virtualizer = useVirtualizer({\n  count: turns.length,\n  estimateSize: () => 200,\n  getScrollElement: () => scrollerRef.current,\n});\n```",
  "Padding spacers keep the mounted items in normal document flow, which means CSS like `position: sticky` and the regular kit styling keep working inside each message.",
  "Auto-follow works by observing the content size with a ResizeObserver and re-pinning the scroller to the bottom while the user has not scrolled away.",
];

const START = Date.UTC(2026, 0, 1);
const AGENT_TOOL_CALLS = 40;

// Every tenth reply is an agent turn (reasoning, a long run of tool calls, an
// answer in one message): the shape that makes a per-message cell expensive.
const agentReply = (i: number): ThreadMessageLike["content"] => [
  { type: "reasoning", text: "Planning which files to read before answering." },
  ...Array.from({ length: AGENT_TOOL_CALLS }, (_, call) => ({
    type: "tool-call" as const,
    toolCallId: `seed-${i}-call-${call}`,
    toolName: call % 2 === 0 ? "read_file" : "grep",
    args: { path: `src/module-${call}.ts` },
    result: { ok: true },
  })),
  { type: "text", text: SNIPPETS[0]! },
];

export const generateSeedMessages = (): ThreadMessageLike[] =>
  Array.from({ length: SEED_COUNT }, (_, i) => {
    const askedAt = START + Math.floor(i / 2) * 600_000;
    if (i % 2 === 0)
      return {
        id: `seed-${i}`,
        role: "user" as const,
        createdAt: new Date(askedAt),
        content: `Question ${i / 2 + 1}: tell me more about long threads.`,
      };

    const isAgentTurn = i % 20 === 1;
    const streamStartTime = askedAt + 1_000;
    return {
      id: `seed-${i}`,
      role: "assistant" as const,
      createdAt: new Date(streamStartTime),
      content: isAgentTurn
        ? agentReply(i)
        : SNIPPETS.slice(0, (i % 3) + 1).join("\n\n"),
      metadata: {
        timing: {
          streamStartTime,
          totalStreamTime: isAgentTurn ? 191_000 : 3_000,
          totalChunks: 1,
          toolCallCount: isAgentTurn ? AGENT_TOOL_CALLS : 0,
        },
      },
    };
  });

export const REPLY_CHUNKS =
  "Sure! This reply is streamed chunk by chunk so you can watch the thread follow the newest tokens. Scroll up at any point and the view stops following until you return to the bottom or press the scroll to bottom button. The reply is intentionally long enough to grow past a single viewport so the auto-follow behavior is easy to observe while it streams in."
    .split(" ")
    .map((word) => `${word} `);
