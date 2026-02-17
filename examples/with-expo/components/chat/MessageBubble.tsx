import { View, StyleSheet, useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useMessage, MessageContent } from "@assistant-ui/react-native";
import { MessageActionBar } from "./MessageActionBar";

function TextPart({ part }: { part: { type: "text"; text: string } }) {
  const role = useMessage((s) => s.role);
  if (role === "user") {
    return <ThemedText style={styles.userText}>{part.text}</ThemedText>;
  }
  return (
    <ThemedText
      style={styles.assistantText}
      lightColor="#000000"
      darkColor="#ffffff"
    >
      {part.text}
    </ThemedText>
  );
}

export function MessageBubble() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const role = useMessage((s) => s.role);
  const isRunning = useMessage((s) => s.status?.type === "running");
  const isUser = role === "user";

  if (isUser) {
    return (
      <View style={[styles.container, styles.userContainer]}>
        <View
          style={[
            styles.bubble,
            styles.userBubble,
            { backgroundColor: isDark ? "#0a84ff" : "#007aff" },
          ]}
        >
          <MessageContent renderText={({ part }) => <TextPart part={part} />} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          styles.assistantBubble,
          {
            backgroundColor: isDark
              ? "rgba(44, 44, 46, 0.8)"
              : "rgba(229, 229, 234, 0.8)",
          },
        ]}
      >
        <MessageContent renderText={({ part }) => <TextPart part={part} />} />
      </View>
      {!isRunning && <MessageActionBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  userText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  assistantText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
});
