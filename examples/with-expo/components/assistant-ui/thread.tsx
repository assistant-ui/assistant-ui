import { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "./message";
import { Composer } from "./composer";
import { ThreadPrimitive } from "@assistant-ui/react-native";
import { useTheme } from "@/hooks/use-theme";
import { Radius, Spacing } from "@/constants/theme";
import { haptics } from "@/lib/haptics";

const suggestions = [
  "What's the weather in Tokyo?",
  "Tell me a joke",
  "Help me write an email",
];

function SuggestionChip({ prompt }: { prompt: string }) {
  const { colors } = useTheme();
  return (
    <ThreadPrimitive.Suggestion
      prompt={prompt}
      send
      onPressIn={haptics.selection}
      style={({ pressed }: { pressed: boolean }) => [
        styles.chip,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.muted : colors.background,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: colors.foreground }]}>
        {prompt}
      </Text>
    </ThreadPrimitive.Suggestion>
  );
}

function EmptyState() {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.welcome, { color: colors.foreground }]}>
        How can I help you today?
      </Text>
      <View style={styles.chips}>
        {suggestions.map((prompt) => (
          <SuggestionChip key={prompt} prompt={prompt} />
        ))}
      </View>
    </View>
  );
}

function ChatMessages() {
  const listRef = useRef<FlatList>(null);
  const nearBottom = useRef(true);

  return (
    <>
      <ThreadPrimitive.Empty>
        <EmptyState />
      </ThreadPrimitive.Empty>
      <ThreadPrimitive.If empty={false}>
        <ThreadPrimitive.Messages
          // Messages isn't a forwardRef component, but it spreads extra props
          // onto its FlatList, so React 19 still forwards this ref to the list.
          {...({ ref: listRef } as object)}
          style={styles.flex}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              e.nativeEvent;
            nearBottom.current =
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - 48;
          }}
          onContentSizeChange={() => {
            if (nearBottom.current)
              listRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {() => <MessageBubble />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.If>
    </>
  );
}

export function Thread() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flex}>
          <ChatMessages />
        </View>
        <View style={{ paddingBottom: insets.bottom + 8 }}>
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
  flex: {
    flex: 1,
  },
  messageList: {
    width: "100%",
    maxWidth: Spacing.threadMaxWidth,
    marginHorizontal: "auto",
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 18,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  welcome: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 24,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
