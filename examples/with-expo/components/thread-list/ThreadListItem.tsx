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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        isActive && {
          backgroundColor: isDark ? "#2c2c2e" : "#e8e8ed",
        },
        pressed && {
          backgroundColor: isDark ? "#3a3a3c" : "#d1d1d6",
        },
      ]}
    >
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 2,
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
