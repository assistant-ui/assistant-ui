import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GenerativeUILibrary } from "../../types";
import { listDefinitions } from "../../vocabulary/definitions/list";
import { fire } from "../../vocabulary/dispatch";
import { sequenceItems } from "../../vocabulary/structureValues";
import {
  createRowLabelStore,
  RowLabelProvider,
  useListViewItemText,
} from "../rowLabel";
import { fade, RADIUS, useInk, useNativeTheme } from "../theme";

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
  sequence: { gap: 14 },
  sequenceItem: { flexDirection: "row", gap: 12 },
  stepMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { fontSize: 12, fontWeight: "600" },
  sequenceBody: { flex: 1, gap: 3 },
  sequenceTitle: { fontSize: 14, fontWeight: "600" },
  sequenceDetail: { fontSize: 12, lineHeight: 18 },
  timelineRail: { width: 12, alignItems: "center" },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { width: 1, flex: 1, marginTop: 3, marginBottom: -14 },
  timelineTime: { fontSize: 12 },
});

const ListHairline = createContext<string | undefined>(undefined);

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
      <RowLabelProvider value={labelStore}>{children}</RowLabelProvider>
    </Pressable>
  );
}

// Stays mounted without a value, so a field that empties and fills again keeps its place in the row name.
function SequenceText({
  value,
  style,
}: {
  value: string | undefined;
  style: ComponentProps<typeof Text>["style"];
}) {
  const consumed = useListViewItemText(value);
  if (value === undefined) return null;
  return (
    <Text aria-hidden={consumed} style={style}>
      {value}
    </Text>
  );
}

function Steps({ steps }: { steps: unknown }) {
  const theme = useNativeTheme();
  const ink = useInk();
  return (
    <View accessibilityRole="list" style={styles.sequence}>
      {sequenceItems(steps).map((step, index) => (
        <View key={index} style={styles.sequenceItem}>
          <View
            style={[styles.stepMarker, { backgroundColor: theme.secondary }]}
          >
            <Text
              style={[styles.stepNumber, { color: theme.secondaryForeground }]}
            >
              {index + 1}
            </Text>
          </View>
          <View style={styles.sequenceBody}>
            <SequenceText
              value={step.title}
              style={[styles.sequenceTitle, { color: ink }]}
            />
            <SequenceText
              value={step.detail}
              style={[styles.sequenceDetail, { color: fade(ink, 0.62) }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function Timeline({ items }: { items: unknown }) {
  const theme = useNativeTheme();
  const ink = useInk();
  const entries = sequenceItems(items);
  return (
    <View accessibilityRole="list" style={styles.sequence}>
      {entries.map((item, index) => (
        <View key={index} style={styles.sequenceItem}>
          <View style={styles.timelineRail}>
            <View
              style={[styles.timelineDot, { backgroundColor: theme.primary }]}
            />
            {index < entries.length - 1 ? (
              <View
                style={[
                  styles.timelineLine,
                  { backgroundColor: theme.hairline },
                ]}
              />
            ) : null}
          </View>
          <View style={styles.sequenceBody}>
            <SequenceText
              value={item.time}
              style={[styles.timelineTime, { color: fade(ink, 0.62) }]}
            />
            <SequenceText
              value={item.title}
              style={[styles.sequenceTitle, { color: ink }]}
            />
            <SequenceText
              value={item.detail}
              style={[styles.sequenceDetail, { color: fade(ink, 0.62) }]}
            />
          </View>
        </View>
      ))}
    </View>
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
  Steps: {
    ...listDefinitions.Steps,
    render: ({ steps }) => <Steps steps={steps} />,
  },
  Timeline: {
    ...listDefinitions.Timeline,
    render: ({ items }) => <Timeline items={items} />,
  },
} satisfies GenerativeUILibrary;
