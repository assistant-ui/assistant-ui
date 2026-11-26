import { NativeChatThread } from "@/registry/blocks/native-chat-thread/components/native-chat-thread";
import { NativeRuntimeProvider } from "@/registry/shared/lib/native-runtime-provider";

/**
 * An Expo Router screen. It streams from EXPO_PUBLIC_CHAT_API when that is
 * set, and plays the scripted demo until then.
 */
export default function NativeChatThreadScreen() {
  return (
    <NativeRuntimeProvider api={process.env.EXPO_PUBLIC_CHAT_API}>
      <NativeChatThread />
    </NativeRuntimeProvider>
  );
}
