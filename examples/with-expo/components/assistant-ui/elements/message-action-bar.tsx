import { View, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Icon } from "@/components/ui/icon";
import { ActionBarPrimitive } from "@assistant-ui/react-native";
import { useTheme } from "@/hooks/use-theme";
import { haptics } from "@/lib/haptics";
import { Radius } from "@/constants/theme";

const copyToClipboard = async (text: string) => {
  await Clipboard.setStringAsync(text);
};

export function MessageActionBar() {
  const { colors } = useTheme();

  const buttonStyle = ({ pressed }: { pressed: boolean }) => [
    styles.button,
    pressed && { backgroundColor: colors.muted },
  ];

  return (
    <View style={styles.container}>
      <ActionBarPrimitive.Copy
        copyToClipboard={copyToClipboard}
        onPressIn={haptics.selection}
        style={buttonStyle}
      >
        {({ isCopied }) => (
          <Icon
            name={isCopied ? "check" : "copy"}
            size={16}
            color={isCopied ? colors.foreground : colors.mutedForeground}
          />
        )}
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload
        onPressIn={haptics.selection}
        style={buttonStyle}
      >
        <Icon name="reload" size={16} color={colors.mutedForeground} />
      </ActionBarPrimitive.Reload>
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
    padding: 6,
    borderRadius: Radius.sm,
  },
});
