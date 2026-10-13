import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { GenerativeUILibrary } from "../../types";
import { factDefinitions } from "../../vocabulary/definitions/fact";
import {
  factTone,
  factTrend,
  formatFactDelta,
} from "../../vocabulary/formatValue";
import { toTextContent } from "../../vocabulary/toTextContent";
import {
  fade,
  RADIUS,
  toneTextColor,
  useInk,
  useInsideCard,
  useNativeTheme,
  useRowChild,
} from "../theme";
import { useListViewItemText } from "../rowLabel";

const styles = StyleSheet.create({
  label: { fontSize: 12 },
  value: { fontSize: 14 },
  headline: { fontSize: 20, fontWeight: "600", lineHeight: 26 },
  cardDetail: { fontSize: 15, fontWeight: "500" },
  valueRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  chip: {
    marginLeft: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
  },
  chipText: { fontSize: 11, fontWeight: "500" },
});

function Fact({
  label,
  value,
  delta,
  trend,
  upIsGood,
  children,
}: {
  label?: string;
  value?: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  upIsGood?: boolean;
  children?: ReactNode;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  const rowChild = useRowChild();
  const insideCard = useInsideCard();
  const direction = factTrend(delta, trend);
  const tone = factTone(direction, upIsGood);
  const color =
    tone === "good"
      ? theme.success
      : tone === "bad"
        ? theme.destructive
        : theme.secondaryForeground;
  const factLabel = toTextContent(label);
  const factValue = toTextContent(value);
  const factDelta =
    typeof delta === "string" ? formatFactDelta(delta, direction) : null;
  const labelConsumed = useListViewItemText(factLabel?.toString());
  const valueConsumed = useListViewItemText(factValue?.toString());
  const deltaConsumed = useListViewItemText(factDelta?.toString());
  const chipColor = tone === "neutral" ? color : toneTextColor(color, ink);
  return (
    <View>
      <Text
        aria-hidden={labelConsumed}
        style={[styles.label, { color: fade(ink, 0.62) }]}
      >
        {factLabel}
      </Text>
      <View style={styles.valueRow}>
        <Text
          aria-hidden={valueConsumed}
          style={[
            styles.value,
            rowChild && (insideCard ? styles.cardDetail : styles.headline),
            { color: ink },
          ]}
        >
          {factValue}
        </Text>
        {factDelta !== null ? (
          <View
            style={[
              styles.chip,
              {
                backgroundColor:
                  tone === "neutral" ? theme.secondary : fade(color, 0.15),
              },
            ]}
          >
            <Text
              aria-hidden={deltaConsumed}
              style={[styles.chipText, { color: chipColor }]}
            >
              {factDelta}
            </Text>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

export const factVocabulary = {
  Fact: {
    ...factDefinitions.Fact,
    render: (props) => <Fact {...props} />,
  },
} satisfies GenerativeUILibrary;
