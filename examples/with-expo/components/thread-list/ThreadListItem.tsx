import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from "react-native";
import { useThreadList } from "@assistant-ui/react-native";

interface ThreadListItemProps {
  threadId: string;
  onPress: () => void;
}

export function ThreadListItem({ threadId, onPress }: ThreadListItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const threadList = useThreadList();

  const threadItem = threadList.threadItems[threadId];
  const title = threadItem?.title || "New Chat";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isDark
            ? pressed
              ? "#2c2c2e"
              : "#1c1c1e"
            : pressed
              ? "#f0f0f0"
              : "#ffffff",
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <View
          style={[
            styles.icon,
            { backgroundColor: isDark ? "#3a3a3c" : "#e5e5ea" },
          ]}
        >
          <Text style={styles.iconText}>💬</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: isDark ? "#ffffff" : "#000000" }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <View style={styles.chevron}>
        <Text
          style={[
            styles.chevronText,
            { color: isDark ? "#48484a" : "#c7c7cc" },
          ]}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
  },
  iconContainer: {
    marginRight: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  chevron: {
    paddingLeft: 4,
  },
  chevronText: {
    fontSize: 22,
    fontWeight: "300",
  },
});
