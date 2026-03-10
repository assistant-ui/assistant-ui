"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Terminal content definition ───────────────────────────────────────────────

type Span = { text: string; color?: string; bold?: boolean; dim?: boolean };
type Line = Span[];

const USER_LABEL: Span = { text: "You: ", color: "#34d399", bold: true };
const AI_LABEL: Span = { text: "AI:", color: "#60a5fa", bold: true };

// Full conversation frames — each frame adds one "chunk" of streamed content.
// The AI response streams word-by-word, simulating real Ink output.

const STATIC_HEADER: Line[] = [
  [{ text: "assistant-ui Terminal Chat", color: "#22d3ee", bold: true }],
  [
    {
      text: "Type a message and press Enter to send. Ctrl+C to exit.",
      dim: true,
    },
  ],
  [],
];

const USER_MESSAGE: Line[] = [
  [USER_LABEL, { text: "What are JavaScript Promises?" }],
  [],
];

// AI response broken into streaming chunks.
// Each string here becomes one "tick" of the typing animation.
const AI_CHUNKS: string[] = [
  "## Response to your question\n",
  "\n",
  'You asked: **"What are JavaScript Promises?"**\n',
  "\n",
  "Here's a quick example in JavaScript:\n",
  "\n",
  "```js\n",
  "const promise = new Promise((resolve, reject) => {\n",
  '  setTimeout(() => resolve("done!"), 1000);\n',
  "});\n",
  "\n",
  "promise.then(result => console.log(result));\n",
  "```\n",
  "\n",
  "### Key points\n",
  "\n",
  "- A `Promise` represents an **async operation**\n",
  "- It can be *pending*, *fulfilled*, or *rejected*\n",
  "- Use `.then()` and `.catch()` to handle results\n",
];

// ── Minimal markdown-to-spans renderer ────────────────────────────────────────
// Converts a single line of markdown-ish text into colored spans,
// just enough to make the demo look real.

function mdLineToSpans(raw: string): Line {
  const spans: Line = [];
  let rest = raw;

  // Heading
  const headingMatch = rest.match(/^(#{1,3}) (.+)$/);
  if (headingMatch) {
    spans.push({ text: headingMatch[2]!, bold: true, color: "#e5e5e5" });
    return spans;
  }

  // List item
  if (rest.startsWith("- ")) {
    spans.push({ text: "  • ", color: "#6b7280" });
    rest = rest.slice(2);
  }

  // Inline formatting: bold, italic, code
  const inlineRe = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;
  while ((match = inlineRe.exec(rest)) !== null) {
    if (match[2]) {
      // bold
      spans.push({ text: match[2], bold: true });
    } else if (match[3]) {
      // italic
      spans.push({ text: match[3], color: "#a78bfa" });
    } else if (match[4]) {
      // code
      spans.push({ text: match[4], color: "#fbbf24" });
    } else if (match[5]) {
      spans.push({ text: match[5] });
    }
  }

  return spans;
}

function mdToLines(text: string): { lines: Line[]; inCodeBlock: boolean }[] {
  const result: Line[] = [];
  let inCode = false;

  for (const rawLine of text.split("\n")) {
    if (rawLine.startsWith("```")) {
      inCode = !inCode;
      if (inCode) {
        // code block start — skip the ``` line
        continue;
      } else {
        continue;
      }
    }

    if (inCode) {
      result.push([{ text: `  ${rawLine}`, color: "#a78bfa" }]);
    } else if (rawLine === "") {
      result.push([]);
    } else {
      result.push(mdLineToSpans(rawLine));
    }
  }

  return [{ lines: result, inCodeBlock: inCode }];
}

// ── Span rendering ───────────────────────────────────────────────────────────

function RenderSpan({ span }: { span: Span }) {
  return (
    <span
      style={{
        color: span.dim ? "#6b7280" : (span.color ?? "#e0e0e0"),
        fontWeight: span.bold ? 700 : 400,
      }}
    >
      {span.text}
    </span>
  );
}

function RenderLine({ line, lineKey }: { line: Line; lineKey: number }) {
  if (line.length === 0) return <div key={lineKey} className="h-4" />;
  return (
    <div key={lineKey}>
      {line.map((span, i) => (
        <RenderSpan key={i} span={span} />
      ))}
    </div>
  );
}

// ── Cursor ────────────────────────────────────────────────────────────────────

function Cursor() {
  return (
    <span className="inline-block h-[18px] w-[8px] translate-y-[2px] animate-pulse bg-emerald-400" />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TerminalDemo() {
  // chunkIndex tracks how many AI chunks have been "streamed"
  const [chunkIndex, setChunkIndex] = useState(-1); // -1 = hasn't started
  const [phase, setPhase] = useState<"idle" | "typing" | "streaming" | "done">(
    "idle",
  );
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse all accumulated AI text so far
  const aiText = AI_CHUNKS.slice(0, Math.max(0, chunkIndex + 1)).join("");
  const parsed = mdToLines(aiText);
  const aiDisplayLines = parsed.flatMap((p) => p.lines);

  const reset = useCallback(() => {
    setChunkIndex(-1);
    setPhase("idle");
  }, []);

  // Animation sequencer
  useEffect(() => {
    if (phase === "idle") {
      // Start typing after a short pause
      timerRef.current = setTimeout(() => setPhase("typing"), 1200);
    } else if (phase === "typing") {
      // Show user message, then start streaming
      timerRef.current = setTimeout(() => {
        setPhase("streaming");
        setChunkIndex(0);
      }, 800);
    } else if (phase === "streaming") {
      if (chunkIndex < AI_CHUNKS.length - 1) {
        // Stream next chunk
        const delay = AI_CHUNKS[chunkIndex]!.length > 20 ? 120 : 80;
        timerRef.current = setTimeout(() => setChunkIndex((i) => i + 1), delay);
      } else {
        // Done streaming
        timerRef.current = setTimeout(() => setPhase("done"), 600);
      }
    } else if (phase === "done") {
      // Restart loop
      timerRef.current = setTimeout(reset, 4000);
    }

    return () => clearTimeout(timerRef.current);
  }, [phase, chunkIndex, reset]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  });

  const showUser = phase !== "idle";
  const showAI = phase === "streaming" || phase === "done";
  const showCursor = phase === "streaming";
  const showInput = phase !== "streaming";

  return (
    <div className="terminal-mockup-section relative">
      <div className="terminal-mockup-glow" />
      <div className="terminal-mockup-frame">
        <div className="terminal-mockup-border" />
        {/* Titlebar */}
        <div className="flex items-center gap-2 border-white/[0.06] border-b bg-[#2a2a2a] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-[#ff5f57]" />
            <div className="size-3 rounded-full bg-[#febc2e]" />
            <div className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 text-center font-mono text-[13px] text-white/50">
            assistant-ui ink
          </div>
        </div>

        {/* Screen */}
        <div
          ref={containerRef}
          className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 h-[380px] overflow-y-auto p-4 font-mono text-[#e0e0e0] text-sm leading-relaxed"
        >
          {/* Static header */}
          {STATIC_HEADER.map((line, i) => (
            <RenderLine key={`h-${i}`} line={line} lineKey={i} />
          ))}

          {/* User message */}
          {showUser && (
            <div className="mt-2">
              {USER_MESSAGE.map((line, i) => (
                <RenderLine key={`u-${i}`} line={line} lineKey={100 + i} />
              ))}
            </div>
          )}

          {/* AI response */}
          {showAI && (
            <div>
              <RenderLine line={[AI_LABEL]} lineKey={200} />
              {aiDisplayLines.map((line, i) => (
                <RenderLine key={`a-${i}`} line={line} lineKey={300 + i} />
              ))}
              {showCursor && <Cursor />}
            </div>
          )}

          {/* Thinking indicator */}
          {phase === "typing" && (
            <div>
              <span style={{ color: "#fbbf24" }}>Thinking...</span>
            </div>
          )}

          {/* Input prompt */}
          {showInput && (
            <div className="mt-4 flex items-center gap-0 rounded border border-white/10 px-3 py-2">
              <span className="text-[#6b7280]">{">"} </span>
              {phase === "idle" ? (
                <>
                  <span className="text-[#6b7280]">Type a message...</span>
                  <Cursor />
                </>
              ) : phase === "done" ? (
                <span className="text-[#6b7280]">Type a message...</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
