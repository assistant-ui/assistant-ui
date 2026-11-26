import { Chat } from "@/registry/blocks/chat/components/chat";
import { RuntimeProvider } from "@/registry/shared/lib/runtime-provider";

export default function ChatPage() {
  // Without a model key the block plays scripted replies, so it works the
  // moment it is installed. Add OPENAI_API_KEY to use the real /api/chat route.
  const demo = !process.env.OPENAI_API_KEY;

  return (
    <RuntimeProvider demo={demo}>
      <div className="h-dvh">
        <Chat />
      </div>
    </RuntimeProvider>
  );
}
