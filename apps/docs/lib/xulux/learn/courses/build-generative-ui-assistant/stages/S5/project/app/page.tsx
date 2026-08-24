import { Thread } from "../components/assistant-ui/thread";
import { ToolProvider } from "../components/tool-provider";

export default function Page() {
  return (
    <ToolProvider>
      <main className="h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <Thread />
      </main>
    </ToolProvider>
  );
}
