import { View, Image, StyleSheet, useColorScheme } from "react-native";
import { ThemedText } from "@/components/themed-text";
import {
  useAuiState,
  MessageContent,
  MessageAttachments,
} from "@assistant-ui/react-native";
import { MessageActionBar } from "./message-action-bar";
import { MessageBranchPicker } from "./message-branch-picker";

function MessageError() {
  const error = useAuiState((s) => {
    const status = s.message.status;
    if (status?.type === "incomplete" && status.reason === "error") {
      return status.error ?? "An error occurred";
    }
    return null;
  });

  if (!error) return null;

  return (
    <View style={styles.errorContainer}>
      <ThemedText
        style={styles.errorText}
        lightColor="#ff453a"
        darkColor="#ff6961"
      >
        {typeof error === "string" ? error : "An error occurred"}
      </ThemedText>
    </View>
  );
}

function TextPart({ part }: { part: { type: "text"; text: string } }) {
  const role = useAuiState((s) => s.message.role);
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

function MessageImageAttachment() {
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  const imageContent = attachment.content?.find((c: any) => c.type === "image");
  const uri = (imageContent as any)?.image;
  if (!uri) return null;

  return <Image source={{ uri }} style={styles.messageImage} />;
}

const messageAttachmentComponents = { Attachment: MessageImageAttachment };

export function MessageBubble() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const role = useAuiState((s) => s.message.role);
  const isRunning = useAuiState((s) => s.message.status?.type === "running");
  const isUser = role === "user";

  if (isUser) {
    return (
      <View style={[styles.container, styles.userContainer]}>
        <MessageAttachments components={messageAttachmentComponents} />
        <View
          style={[
            styles.bubble,
            styles.userBubble,
            { backgroundColor: isDark ? "#0a84ff" : "#007aff" },
          ]}
        >
          <MessageContent renderText={({ part }) => <TextPart part={part} />} />
        </View>
        <MessageBranchPicker />
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
        <MessageError />
      </View>
      {!isRunning && (
        <View style={styles.actionsRow}>
          <MessageBranchPicker />
          <MessageActionBar />
        </View>
      )}
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
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  errorContainer: {
    paddingTop: 4,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
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
