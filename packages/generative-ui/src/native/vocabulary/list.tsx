import { Children, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { GenerativeUILibrary } from "../../types";
import { listDefinitions } from "../../vocabulary/definitions/list";
import { fire } from "../../vocabulary/dispatch";
import { RADIUS, useNativeTheme } from "../theme";

const styles = StyleSheet.create({
  list: { flexDirection: "column" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  trigger: { borderRadius: RADIUS.control },
});

function ListView({ children }: { children?: ReactNode }) {
  const theme = useNativeTheme();
  return (
    <View style={styles.list}>
      {Children.map(children, (child, index) => (
        <View
          style={
            index > 0
              ? { borderTopWidth: 1, borderTopColor: theme.hairline }
              : undefined
          }
        >
          {child}
        </View>
      ))}
    </View>
  );
}

function ListViewItem({
  $action,
  $dispatch,
  children,
}: {
  $action?: Parameters<typeof fire>[0];
  $dispatch?: Parameters<typeof fire>[1];
  children?: ReactNode;
}) {
  if (!$action) return <View style={styles.item}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => fire($action, $dispatch)}
      style={({ pressed }) => [
        styles.item,
        styles.trigger,
        pressed && { opacity: 0.85 },
      ]}
    >
      {children}
    </Pressable>
  );
}

export const listVocabulary = {
  ListView: {
    ...listDefinitions.ListView,
    render: (props) => <ListView {...props} />,
  },
  ListViewItem: {
    ...listDefinitions.ListViewItem,
    render: (props) => <ListViewItem {...props} />,
  },
} satisfies GenerativeUILibrary;
