import {
  useAssistantRuntime,
  useThreadList,
  ThreadProvider,
  ComposerProvider,
} from "@assistant-ui/react-native";
import { ChatScreen } from "@/components/chat/ChatScreen";

export default function ChatPage() {
  const runtime = useAssistantRuntime();
  const mainThreadId = useThreadList((s) => s.mainThreadId);

  return (
    <ThreadProvider key={mainThreadId} runtime={runtime.thread}>
      <ComposerProvider runtime={runtime.thread.composer}>
        <ChatScreen />
      </ComposerProvider>
    </ThreadProvider>
  );
}
