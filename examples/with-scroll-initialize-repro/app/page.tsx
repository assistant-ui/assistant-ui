import Link from "next/link";

export default function Home() {
  return (
    <main className="grid h-dvh place-items-center p-4">
      <section className="w-full max-w-3xl rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
          assistant-ui issue #4009
        </p>
        <h1 className="font-semibold text-2xl">Scroll initialize repro</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Temporary harness for comparing initial viewport scroll behavior
          across synchronous initial messages and asynchronous history loading.
        </p>
        <div className="mt-6 grid gap-2">
          <Link
            className="flex justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            href="/sync-initial-messages"
          >
            <span>Sync initialMessages</span>
            <span>/sync-initial-messages</span>
          </Link>
          <Link
            className="flex justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            href="/async-history-adapter"
          >
            <span>Async history adapter</span>
            <span>/async-history-adapter</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
