import { View, StyleSheet, useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import type { ThreadMessage } from "@assistant-ui/react-native";

type MessageBubbleProps = {
  message: ThreadMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isUser = message.role === "user";

  const textContent = message.content
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");

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
          <ThemedText style={styles.userText}>{textContent}</ThemedText>
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
        <ThemedText
          style={styles.assistantText}
          lightColor="#000000"
          darkColor="#ffffff"
        >
          {textContent}
        </ThemedText>
      </View>
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
