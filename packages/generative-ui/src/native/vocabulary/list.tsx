import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
  rowAction: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
});

const ListHairline = createContext<string | undefined>(undefined);

function createRowLabelStore() {
  const labels = new Map<string, string>();
  const listeners = new Set<() => void>();
  let name: string | undefined;
  return {
    set(key: string, text: string | undefined) {
      if (text) labels.set(key, text);
      else labels.delete(key);
      const next = [...labels.values()].join(", ") || undefined;
      if (next === name) return;
      name = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => name,
  };
}

const RowLabelContext = createContext<ReturnType<
  typeof createRowLabelStore
> | null>(null);

export function useListViewItemText(text: string | undefined): boolean {
  const store = useContext(RowLabelContext);
  const key = useId();
  useLayoutEffect(() => {
    store?.set(key, text);
  }, [store, key, text]);
  useLayoutEffect(() => () => store?.set(key, undefined), [store, key]);
  return store !== null;
}

function RowAction({
  store,
  activate,
}: {
  store: ReturnType<typeof createRowLabelStore>;
  activate: () => void;
}) {
  const name = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={activate}
      onAccessibilityTap={activate}
      style={styles.rowAction}
    />
  );
}

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
  const [labelStore] = useState(createRowLabelStore);
  const style = [
    styles.item,
    hairline !== undefined && {
      borderBottomWidth: 1,
      borderBottomColor: hairline,
    },
  ];
  if (!$action || !$dispatch) return <View style={style}>{children}</View>;
  const activate = () => fire($action, $dispatch);
  return (
    <Pressable
      accessible={false}
      focusable={false}
      importantForAccessibility="no"
      onPress={activate}
      style={({ pressed }) => [
        ...style,
        styles.trigger,
        pressed && { opacity: 0.85 },
      ]}
    >
      <RowAction store={labelStore} activate={activate} />
      <RowLabelContext.Provider value={labelStore}>
        {children}
      </RowLabelContext.Provider>
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
