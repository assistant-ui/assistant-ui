import { createFileRoute } from "@tanstack/react-router";
import { Thread } from "@/components/assistant-ui/thread";
import { MyRuntimeProvider } from "@/components/MyRuntimeProvider";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <MyRuntimeProvider>
      <main className="h-dvh">
        <Thread />
      </main>
    </MyRuntimeProvider>
  );
}
