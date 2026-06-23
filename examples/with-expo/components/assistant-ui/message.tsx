import { useEffect, useRef } from "react";
import { View, Text, Animated, Platform, StyleSheet } from "react-native";
import { Image } from "expo-image";
import {
  useAuiState,
  MessagePrimitive,
  ErrorPrimitive,
  type TextMessagePartComponent,
} from "@assistant-ui/react-native";
import { useTheme } from "@/hooks/use-theme";
import { Radius } from "@/constants/theme";
import { MessageActionBar } from "./message-action-bar";
import { MessageBranchPicker } from "./message-branch-picker";

const UserText: TextMessagePartComponent = ({ text }) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.userText, { color: colors.foreground }]}>{text}</Text>
  );
};

const AssistantText: TextMessagePartComponent = ({ text }) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.assistantText, { color: colors.foreground }]}>
      {text}
    </Text>
  );
};

function TypingDot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={[styles.dot, { opacity, backgroundColor: colors.mutedForeground }]}
    />
  );
}

function TypingIndicator() {
  const isRunning = useAuiState((s) => s.message.status?.type === "running");
  if (!isRunning) return null;

  return (
    <View style={styles.typing}>
      <TypingDot delay={0} />
      <TypingDot delay={160} />
      <TypingDot delay={320} />
    </View>
  );
}

function MessageImageAttachment() {
  const { colors } = useTheme();
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  const imageContent = attachment.content?.find((c: any) => c.type === "image");
  const uri = (imageContent as any)?.image;
  if (!uri) return null;

  return (
    <Image
      source={{ uri }}
      style={[styles.messageImage, { backgroundColor: colors.muted }]}
      contentFit="cover"
      transition={120}
    />
  );
}

function UserMessage() {
  const { colors } = useTheme();
  return (
    <MessagePrimitive.Root style={styles.userContainer}>
      <View style={styles.userAttachments}>
        <MessagePrimitive.Attachments>
          {() => <MessageImageAttachment />}
        </MessagePrimitive.Attachments>
      </View>
      <View style={[styles.userBubble, { backgroundColor: colors.muted }]}>
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </View>
      <MessageBranchPicker align="flex-end" />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const { colors } = useTheme();
  return (
    <MessagePrimitive.Root style={styles.assistantContainer}>
      <View style={styles.assistantContent}>
        <MessagePrimitive.Parts
          components={{ Text: AssistantText, Empty: TypingIndicator }}
        />
        <ErrorPrimitive.Root
          style={[
            styles.error,
            {
              backgroundColor: colors.destructiveSurface,
              borderColor: colors.destructive,
            },
          ]}
        >
          <ErrorPrimitive.Message
            style={[styles.errorText, { color: colors.destructive }]}
          />
        </ErrorPrimitive.Root>
      </View>
      <MessagePrimitive.If running={false}>
        <View style={styles.actionsRow}>
          <MessageBranchPicker align="flex-start" />
          <MessageActionBar />
        </View>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
}

export function MessageBubble() {
  const role = useAuiState((s) => s.message.role);
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: "flex-end",
  },
  userAttachments: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  userBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.bubble,
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  assistantContent: {
    paddingHorizontal: 2,
  },
  userText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  assistantText: {
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: Radius.card,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    marginLeft: -4,
  },
  error: {
    marginTop: 8,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
