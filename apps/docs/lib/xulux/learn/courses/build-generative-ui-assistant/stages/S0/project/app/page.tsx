export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6 text-[var(--foreground)]">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--muted)]/40 p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          Build a Generative UI Assistant
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your assistant starts here.
        </h1>
        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
          This prepared Next.js project has no chat interface yet. The next
          stage connects assistant-ui and sends the first message.
        </p>
      </section>
    </main>
  );
}
