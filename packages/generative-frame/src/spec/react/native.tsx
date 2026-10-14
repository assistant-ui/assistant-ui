import { StyleSheet, Text, View } from "react-native";
import {
  SpecRenderer as BaseSpecRenderer,
  type SpecPlaceholderProps,
  type SpecRendererProps,
} from "./SpecRenderer";

const styles = StyleSheet.create({
  pending: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(128, 128, 128, 0.35)",
  },
  note: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(128, 128, 128, 0.6)",
    borderRadius: 6,
  },
  message: { fontSize: 12, opacity: 0.6 },
});

/** A small, unobtrusive stand-in for elements that cannot render, drawn with React Native views. */
export function SpecPlaceholder({ id, reason, message }: SpecPlaceholderProps) {
  if (reason === "pending") {
    return (
      <View
        testID="gf-spec-placeholder-pending"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.pending}
      >
        <View style={styles.pendingDot} />
        <View style={styles.pendingDot} />
        <View style={styles.pendingDot} />
      </View>
    );
  }
  return (
    <View
      testID={`gf-spec-placeholder-${reason}`}
      accessibilityLabel={`${id}: ${message}`}
      style={styles.note}
    >
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

/** `SpecRenderer` for React Native: the same renderer, with a placeholder made of React Native views. */
export function SpecRenderer({
  placeholder = SpecPlaceholder,
  ...props
}: SpecRendererProps) {
  return <BaseSpecRenderer {...props} placeholder={placeholder} />;
}
