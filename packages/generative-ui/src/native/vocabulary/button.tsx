import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ButtonStyle } from "../../ir";
import { ListViewItemTextBoundary } from "../rowLabel";
import {
  fade,
  InkProvider,
  RADIUS,
  useNativeTheme,
  type NativeTheme,
} from "../theme";

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    paddingHorizontal: 20,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },
  label: { fontSize: 14, fontWeight: "500", fontVariant: ["tabular-nums"] },
});

const toneColors = (tone: ButtonStyle | undefined, theme: NativeTheme) => {
  switch (tone) {
    case "primary":
      return { background: theme.primary, text: theme.primaryForeground };
    case "outline":
      return {
        background: "transparent",
        text: theme.foreground,
        border: theme.hairline,
      };
    case "ghost":
      return { background: "transparent", text: theme.foreground };
    case "danger":
      return { background: theme.destructive, text: theme.primaryForeground };
    default:
      return { background: theme.secondary, text: theme.secondaryForeground };
  }
};

/** The pressable face shared by `Button` and a Card's footer buttons. */
export function ActionButton({
  label,
  tone,
  block,
  pending,
  accessibilityLabel,
  onPress,
  children,
}: {
  label: string;
  tone: ButtonStyle | undefined;
  block?: boolean | undefined;
  pending?: boolean | undefined;
  accessibilityLabel?: string | undefined;
  onPress: () => void;
  children?: ReactNode;
}) {
  const theme = useNativeTheme();
  const colors = toneColors(tone, theme);
  return (
    <Pressable
      accessibilityRole="button"
      {...(accessibilityLabel !== undefined ? { accessibilityLabel } : {})}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pending
            ? fade(theme.secondary, 0.72)
            : colors.background,
        },
        colors.border !== undefined && { borderColor: colors.border },
        block && { width: "100%" },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: pending ? theme.secondaryForeground : colors.text },
        ]}
      >
        {label}
      </Text>
      <InkProvider value={pending ? theme.secondaryForeground : colors.text}>
        <ListViewItemTextBoundary>{children}</ListViewItemTextBoundary>
      </InkProvider>
    </Pressable>
  );
}
