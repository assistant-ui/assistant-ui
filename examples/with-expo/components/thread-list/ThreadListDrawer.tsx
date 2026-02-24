import { FlatList, View, StyleSheet, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAssistantRuntime, useAuiState } from "@assistant-ui/react-native";
import { ThreadListItem } from "./ThreadListItem";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

export function ThreadListDrawer({ navigation }: DrawerContentComponentProps) {
  const runtime = useAssistantRuntime();
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);
  const threadItems = useAuiState((s) => s.threads.threadItems);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(28, 28, 30, 0.85)"
            : "rgba(242, 242, 247, 0.85)",
          paddingTop: insets.top,
        },
      ]}
    >
      <FlatList
        data={threadIds}
        keyExtractor={(item) => item}
        renderItem={({ item: threadId }) => {
          const threadItem = threadItems.find((t) => t.id === threadId);
          return (
            <ThreadListItem
              title={threadItem?.title ?? "New Chat"}
              isActive={threadId === mainThreadId}
              onPress={() => {
                runtime.threads.switchToThread(threadId);
                navigation.closeDrawer();
              }}
            />
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
  },
});
