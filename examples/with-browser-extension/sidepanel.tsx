import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { MyThread } from "./MyThread";
import { useMockStore } from "./mock-store";

function App() {
  const store = useMockStore();
  const runtime = useExternalStoreRuntime({
    messages: store.messages,
    setMessages: store.setMessages,
    isRunning: store.isRunning,
    onNew: store.onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="h-dvh">
        <MyThread />
      </main>
    </AssistantRuntimeProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
