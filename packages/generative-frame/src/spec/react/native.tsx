import { StyleSheet, Text, View } from "react-native";
import {
  SpecRenderer as BaseSpecRenderer,
  type SpecPlaceholderProps,
  type SpecRendererProps,
} from "./SpecRenderer";

const styles = StyleSheet.create({
  pending: {
    height: 16,
    marginVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(128, 128, 128, 0.12)",
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
      />
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
