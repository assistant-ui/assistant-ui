import { View, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionBarCopy, ActionBarReload } from "@assistant-ui/react-native";

export function MessageActionBar() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#8e8e93" : "#6e6e73";

  return (
    <View style={styles.container}>
      <ActionBarCopy style={styles.button}>
        {({ isCopied }) => (
          <Ionicons
            name={isCopied ? "checkmark" : "copy-outline"}
            size={16}
            color={isCopied ? "#34c759" : iconColor}
          />
        )}
      </ActionBarCopy>
      <ActionBarReload style={styles.button}>
        <Ionicons name="refresh-outline" size={16} color={iconColor} />
      </ActionBarReload>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  button: {
    padding: 6,
    borderRadius: 8,
  },
});
