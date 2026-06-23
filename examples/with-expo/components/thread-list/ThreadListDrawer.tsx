import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ThreadListPrimitive,
  ThreadListItemByIndexProvider,
  useAui,
} from "@assistant-ui/react-native";
import type { DrawerContentComponentProps } from "expo-router/build/react-navigation/drawer/types";
import { ThreadListItem } from "./ThreadListItem";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { Radius } from "@/constants/theme";
import { haptics } from "@/lib/haptics";

export function ThreadListDrawer({ navigation }: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const aui = useAui();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <ThreadListPrimitive.Root style={styles.root}>
        <Pressable
          onPressIn={haptics.selection}
          onPress={() => {
            aui.threads().switchToNewThread();
            navigation.closeDrawer();
          }}
          style={({ pressed }) => [
            styles.newButton,
            { backgroundColor: pressed ? colors.muted : "transparent" },
          ]}
        >
          <Icon name="compose" size={18} color={colors.foreground} />
          <Text style={[styles.newLabel, { color: colors.foreground }]}>
            New chat
          </Text>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Recent
        </Text>

        <ThreadListPrimitive.Items
          renderItem={({ index }) => (
            <ThreadListItemByIndexProvider index={index} archived={false}>
              <ThreadListItem onSelect={() => navigation.closeDrawer()} />
            </ThreadListItemByIndexProvider>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </ThreadListPrimitive.Root>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 40,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: Radius.md,
  },
  newLabel: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
});
