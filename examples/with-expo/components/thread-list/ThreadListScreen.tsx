import {
  View,
  FlatList,
  StyleSheet,
  Text,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThreadListItem } from "./ThreadListItem";
import type { ThreadMetadata } from "@/hooks/use-threads-store";

interface ThreadListScreenProps {
  threads: ThreadMetadata[];
  isLoading: boolean;
  onThreadPress: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

export function ThreadListScreen({
  threads,
  isLoading,
  onThreadPress,
  onDeleteThread,
}: ThreadListScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? "#000000" : "#f2f2f7";

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator
          size="large"
          color={isDark ? "#ffffff" : "#000000"}
        />
      </View>
    );
  }

  if (threads.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
        </View>
        <Text
          style={[styles.emptyTitle, { color: isDark ? "#ffffff" : "#000000" }]}
        >
          Start a Conversation
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: isDark ? "#8e8e93" : "#6e6e73" },
          ]}
        >
          Tap the + button to begin
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: bgColor }]}
    >
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThreadListItem
            thread={item}
            onPress={() => onThreadPress(item.id)}
            onDelete={() => onDeleteThread(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  listContent: {
    paddingTop: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 36,
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
