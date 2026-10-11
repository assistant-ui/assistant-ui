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
import { fade, RADIUS, useInk, useNativeTheme } from "../theme";

const styles = StyleSheet.create({
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.55 },
  value: { fontSize: 14 },
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
  const direction = factTrend(delta, trend);
  const tone = factTone(direction, upIsGood);
  const color =
    tone === "good"
      ? theme.success
      : tone === "bad"
        ? theme.destructive
        : theme.secondaryForeground;
  return (
    <View>
      <Text style={[styles.label, { color: fade(ink, 0.62) }]}>
        {toTextContent(label)}
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: ink }]}>
          {toTextContent(value)}
        </Text>
        {typeof delta === "string" ? (
          <View
            style={[
              styles.chip,
              {
                backgroundColor:
                  tone === "neutral" ? theme.secondary : fade(color, 0.15),
              },
            ]}
          >
            <Text style={[styles.chipText, { color }]}>
              {formatFactDelta(delta, direction)}
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
