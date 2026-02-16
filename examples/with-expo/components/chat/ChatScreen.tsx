import { useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "./MessageBubble";
import { ChatComposer } from "./ChatComposer";
import {
  useThread,
  useThreadRuntime,
  type ThreadMessage,
} from "@assistant-ui/react-native";

function ChatMessages() {
  const flatListRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const messages = useThread((s) => s.messages) as ThreadMessage[];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (isEmpty) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: isDark ? "#000000" : "#ffffff" },
        ]}
      >
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>💭</Text>
        </View>
        <Text
          style={[styles.emptyTitle, { color: isDark ? "#ffffff" : "#000000" }]}
        >
          How can I help?
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: isDark ? "#8e8e93" : "#6e6e73" },
          ]}
        >
          Send a message to start chatting
        </Text>
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
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
    />
  );
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const threadRuntime = useThreadRuntime();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000000" : "#ffffff" },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.messagesContainer}>
          <ChatMessages />
        </View>
        <View style={{ paddingBottom: insets.bottom }}>
          <ChatComposer threadRuntime={threadRuntime} />
        </View>
      </KeyboardAvoidingView>
    </View>
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
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    letterSpacing: -0.2,
  },
});
