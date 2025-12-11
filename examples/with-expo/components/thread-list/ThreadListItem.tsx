import { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useColorScheme,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { ThreadMetadata } from "@/hooks/use-threads-store";

interface ThreadListItemProps {
  thread: ThreadMetadata;
  onPress: () => void;
  onDelete: () => void;
}

export function ThreadListItem({
  thread,
  onPress,
  onDelete,
}: ThreadListItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const swipeableRef = useRef<Swipeable>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Animated.View style={[styles.deleteContainer, { opacity }]}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
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
            {thread.title}
          </Text>
          <Text
            style={[styles.date, { color: isDark ? "#8e8e93" : "#6e6e73" }]}
          >
            {formatDate(thread.lastMessageAt)}
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
    </Swipeable>
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
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  date: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  chevron: {
    paddingLeft: 4,
  },
  chevronText: {
    fontSize: 22,
    fontWeight: "300",
  },
  deleteContainer: {
    width: 80,
    marginVertical: 4,
    marginRight: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ff453a",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  deleteText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
