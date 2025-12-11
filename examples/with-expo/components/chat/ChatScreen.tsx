import { useRef, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { MessageBubble } from "./MessageBubble";
import { ChatComposer } from "./ChatComposer";
import { useChatRuntime } from "@/hooks/use-chat-runtime";
import {
  ThreadProvider,
  ComposerProvider,
  useThread,
  useComposer,
} from "@assistant-ui/react-native";
import type { ThreadMessage } from "@assistant-ui/core";

function ChatMessages() {
  const flatListRef = useRef<FlatList>(null);
  const messages = useThread((state) => state.messages) as ThreadMessage[];
  const isEmpty = useThread((state) => state.isEmpty);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (isEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          Send a message to start the conversation
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerStyle={styles.messageList}
      contentInsetAdjustmentBehavior="automatic"
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
    />
  );
}

function ChatComposerContainer({
  composerRuntime,
}: {
  composerRuntime: ReturnType<typeof useChatRuntime>["composerRuntime"];
}) {
  const text = useComposer((state) => state.text);
  const canSend = useComposer((state) => state.canSend);
  const isRunning = useThread((state) => state.isRunning);

  return (
    <ChatComposer
      composerRuntime={composerRuntime}
      text={text}
      canSend={canSend}
      isRunning={isRunning}
    />
  );
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { threadRuntime, composerRuntime } = useChatRuntime();

  return (
    <ThreadProvider runtime={threadRuntime}>
      <ComposerProvider runtime={composerRuntime}>
        <ThemedView style={styles.container}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <View style={styles.messagesContainer}>
              <ChatMessages />
            </View>
            <View style={{ paddingBottom: insets.bottom }}>
              <ChatComposerContainer composerRuntime={composerRuntime} />
            </View>
          </KeyboardAvoidingView>
        </ThemedView>
      </ComposerProvider>
    </ThreadProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
});
