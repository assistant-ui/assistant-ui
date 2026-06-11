import type { ThreadMessageLike } from "@assistant-ui/react";

const SEED_COUNT = 500;

const SNIPPETS = [
  "Virtualization keeps the DOM small by only mounting the messages near the viewport. Everything else is represented by empty space, so scrolling through thousands of messages stays cheap.",
  "Here is a list of things to keep in mind:\n\n- only mount what is visible\n- measure real heights after mount\n- keep React keys stable across index shifts",
  "```ts\nconst virtualizer = useVirtualizer({\n  count: turns.length,\n  estimateSize: () => 200,\n  getScrollElement: () => scrollerRef.current,\n});\n```",
  "Padding spacers keep the mounted items in normal document flow, which means CSS like `position: sticky` and the regular kit styling keep working inside each message.",
  "Auto-follow works by observing the content size with a ResizeObserver and re-pinning the scroller to the bottom while the user has not scrolled away.",
];

export const generateSeedMessages = (): ThreadMessageLike[] =>
  Array.from({ length: SEED_COUNT }, (_, i) => ({
    id: `seed-${i}`,
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content:
      i % 2 === 0
        ? `Question ${i / 2 + 1}: tell me more about long threads.`
        : SNIPPETS.slice(0, (i % 3) + 1).join("\n\n"),
  }));

export const REPLY_CHUNKS =
  "Sure! This reply is streamed chunk by chunk so you can watch the thread follow the newest tokens. Scroll up at any point and the view stops following until you return to the bottom or press the scroll to bottom button. The reply is intentionally long enough to grow past a single viewport so the auto-follow behavior is easy to observe while it streams in."
    .split(" ")
    .map((word) => `${word} `);
