import { Thread } from "../components/assistant-ui/elements/thread.aui";

export default function Page() {
  return (
    <main className="h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Thread />
    </main>
  );
}
