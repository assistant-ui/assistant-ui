import { Pressable, View, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useActionBarCopy,
  useActionBarReload,
} from "@assistant-ui/react-native";

export function MessageActionBar() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#8e8e93" : "#6e6e73";

  const { copy, isCopied } = useActionBarCopy();
  const { reload } = useActionBarReload();

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={copy}>
        <Ionicons
          name={isCopied ? "checkmark" : "copy-outline"}
          size={16}
          color={isCopied ? "#34c759" : iconColor}
        />
      </Pressable>
      <Pressable style={styles.button} onPress={reload}>
        <Ionicons name="refresh-outline" size={16} color={iconColor} />
      </Pressable>
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
