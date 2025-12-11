import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { ThreadMessage } from "@assistant-ui/core";

type MessageBubbleProps = {
  message: ThreadMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const userBubbleColor = useThemeColor({}, "tint");
  const assistantBubbleColor = useThemeColor(
    { light: "#f0f0f0", dark: "#2a2a2a" },
    "background",
  );

  const textContent = message.content
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: userBubbleColor }]
            : [
                styles.assistantBubble,
                { backgroundColor: assistantBubbleColor },
              ],
        ]}
      >
        <ThemedText
          style={[styles.text, isUser && styles.userText]}
          lightColor={isUser ? "#fff" : undefined}
          darkColor={isUser ? "#fff" : undefined}
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
    paddingVertical: 4,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
});
