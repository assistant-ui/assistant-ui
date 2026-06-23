import { Text, Pressable, StyleSheet } from "react-native";
import {
  ThreadListItemPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react-native";
import { useTheme } from "@/hooks/use-theme";
import { Radius } from "@/constants/theme";
import { haptics } from "@/lib/haptics";

export function ThreadListItem({ onSelect }: { onSelect: () => void }) {
  const { colors } = useTheme();
  const aui = useAui();
  const isActive = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );

  return (
    <ThreadListItemPrimitive.Root>
      <Pressable
        onPressIn={haptics.selection}
        onPress={() => {
          aui.threadListItem().switchTo();
          onSelect();
        }}
        style={({ pressed }) => [
          styles.item,
          (isActive || pressed) && { backgroundColor: colors.muted },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: colors.foreground,
              fontWeight: isActive ? "600" : "400",
            },
          ]}
        >
          <ThreadListItemPrimitive.Title fallback="New chat" />
        </Text>
      </Pressable>
    </ThreadListItemPrimitive.Root>
  );
}

const styles = StyleSheet.create({
  item: {
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    marginHorizontal: 8,
    borderRadius: Radius.md,
  },
  title: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
