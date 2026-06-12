const INK_DEMO_URL =
  process.env.NEXT_PUBLIC_INK_DEMO_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8081"
    : "https://assistant-ui-ink.vercel.app");

export function TerminalDemo() {
  return (
    <section className="py-8">
      <div className="mx-auto w-full max-w-[800px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-[#ff5f57]" />
            <div className="size-3 rounded-full bg-[#febc2e]" />
            <div className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 text-center font-mono text-[13px] text-white/50">
            assistant-ui ink
          </div>
        </div>
        <iframe
          src={INK_DEMO_URL}
          className="h-[480px] w-full"
          title="assistant-ui ink live demo"
          allow="clipboard-read; clipboard-write"
        />
      </div>
      <p className="text-muted-foreground mt-3 text-center font-mono text-xs">
        A real Ink render loop and a real LLM, live. Click or tap the terminal
        and type.
      </p>
    </section>
  );
}
