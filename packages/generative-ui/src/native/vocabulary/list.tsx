import { createContext, useContext, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { GenerativeUILibrary } from "../../types";
import { listDefinitions } from "../../vocabulary/definitions/list";
import { fire } from "../../vocabulary/dispatch";
import { RADIUS, useNativeTheme } from "../theme";

const styles = StyleSheet.create({
  list: { overflow: "hidden" },
  listContent: { flexDirection: "column", marginBottom: -1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  trigger: { borderRadius: RADIUS.control },
});

const ListHairline = createContext<string | undefined>(undefined);

function ListView({ children }: { children?: ReactNode }) {
  const theme = useNativeTheme();
  return (
    <View accessibilityRole="list" style={styles.list}>
      <ListHairline.Provider value={theme.hairline}>
        <View style={styles.listContent}>{children}</View>
      </ListHairline.Provider>
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
  const hairline = useContext(ListHairline);
  const style = [
    styles.item,
    hairline !== undefined && {
      borderBottomWidth: 1,
      borderBottomColor: hairline,
    },
  ];
  if (!$action || !$dispatch) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => fire($action, $dispatch)}
      style={({ pressed }) => [
        ...style,
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
