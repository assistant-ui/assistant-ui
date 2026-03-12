import { View, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { BranchPickerPrimitive, useAuiState } from "@assistant-ui/react-native";

export function MessageBranchPicker() {
  const branchNumber = useAuiState((s) => s.message.branchNumber);
  const branchCount = useAuiState((s) => s.message.branchCount);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#8e8e93" : "#6e6e73";

  if (branchCount <= 1) return null;

  return (
    <View style={styles.container}>
      <BranchPickerPrimitive.Previous style={styles.button}>
        <Ionicons
          name="chevron-back"
          size={14}
          color={
            branchNumber <= 1 ? (isDark ? "#3a3a3c" : "#d1d1d6") : iconColor
          }
        />
      </BranchPickerPrimitive.Previous>
      <ThemedText style={styles.label} lightColor="#6e6e73" darkColor="#8e8e93">
        {branchNumber} / {branchCount}
      </ThemedText>
      <BranchPickerPrimitive.Next style={styles.button}>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={
            branchNumber >= branchCount
              ? isDark
                ? "#3a3a3c"
                : "#d1d1d6"
              : iconColor
          }
        />
      </BranchPickerPrimitive.Next>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  button: {
    padding: 4,
    borderRadius: 6,
  },
  label: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
});
