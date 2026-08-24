import { Thread } from "../components/assistant-ui/thread";

export default function Page() {
  return (
    <main className="h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Thread />
    </main>
  );
}
