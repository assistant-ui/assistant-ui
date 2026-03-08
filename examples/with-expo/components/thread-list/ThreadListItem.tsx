import {
  Pressable,
  Text,
  View,
  StyleSheet,
  useColorScheme,
} from "react-native";

type ThreadListItemProps = {
  title: string;
  isActive: boolean;
  onPress: () => void;
};

export function ThreadListItem({
  title,
  isActive,
  onPress,
}: ThreadListItemProps) {
  const isDark = useColorScheme() === "dark";

  const content = (
    <View style={styles.row}>
      {isActive && (
        <View style={[styles.indicator, { backgroundColor: "#007AFF" }]} />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          { color: isDark ? "#ffffff" : "#000000" },
          isActive && styles.titleActive,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  if (isActive) {
    return (
      <Pressable onPress={onPress} style={styles.itemOuter}>
        <View
          style={[
            styles.glassItem,
            {
              backgroundColor: isDark
                ? "rgba(44, 44, 46, 0.6)"
                : "rgba(209, 209, 214, 0.6)",
            },
          ]}
        >
          {content}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemOuter,
        styles.itemPadding,
        pressed && {
          backgroundColor: isDark ? "#3a3a3c" : "#d1d1d6",
          borderRadius: 10,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  itemOuter: {
    marginHorizontal: 8,
    marginVertical: 2,
  },
  itemPadding: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  glassItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  indicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    flex: 1,
  },
  titleActive: {
    fontWeight: "600",
  },
});
