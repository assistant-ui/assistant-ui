import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "./message";
import { Composer } from "./composer";
import {
  ThreadMessages,
  useThreadIsEmpty,
  useAui,
} from "@assistant-ui/react-native";

function SuggestionChip({ title, prompt }: { title: string; prompt: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const aui = useAui();

  return (
    <Pressable
      onPress={() => aui.thread().append(prompt)}
      style={[
        styles.suggestionChip,
        {
          backgroundColor: isDark
            ? "rgba(44, 44, 46, 0.8)"
            : "rgba(229, 229, 234, 0.8)",
        },
      ]}
    >
      <Text
        style={[
          styles.suggestionText,
          { color: isDark ? "#ffffff" : "#000000" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const defaultSuggestions = [
  {
    title: "What's the weather in Tokyo?",
    prompt: "What's the weather in Tokyo?",
  },
  { title: "Tell me a joke", prompt: "Tell me a joke" },
  { title: "Help me write an email", prompt: "Help me write an email" },
];

function Suggestions() {
  return (
    <View style={styles.suggestionsContainer}>
      {defaultSuggestions.map((s, i) => (
        <SuggestionChip key={i} title={s.title} prompt={s.prompt} />
      ))}
    </View>
  );
}

function EmptyState() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
      <Suggestions />
    </View>
  );
}

const renderMessage = () => <MessageBubble />;

function ChatMessages() {
  const isEmpty = useThreadIsEmpty();

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
    <ThreadMessages
      renderMessage={renderMessage}
      contentContainerStyle={styles.messageList}
      showsVerticalScrollIndicator={false}
    />
  );
}

export function Thread() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
          <Composer />
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
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  suggestionText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
