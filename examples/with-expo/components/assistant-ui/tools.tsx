import { View, Text, StyleSheet, useColorScheme } from "react-native";
import {
  makeAssistantTool,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react-native";

const WeatherToolUI = (
  props: ToolCallMessagePartProps<{ city: string }, { temperature: number }>,
) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (props.status?.type === "running") {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1c1c1e" : "#f2f2f7" },
        ]}
      >
        <Text style={[styles.label, { color: isDark ? "#8e8e93" : "#6e6e73" }]}>
          Looking up weather for {props.args.city}...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: isDark ? "#1c1c1e" : "#f2f2f7" }]}
    >
      <Text style={[styles.city, { color: isDark ? "#ffffff" : "#000000" }]}>
        {props.args.city}
      </Text>
      <Text style={styles.temp}>{props.result?.temperature ?? "—"}°F</Text>
      <Text style={[styles.label, { color: isDark ? "#8e8e93" : "#6e6e73" }]}>
        Current Weather
      </Text>
    </View>
  );
};

export const WeatherTool = makeAssistantTool({
  toolName: "get_weather",
  description: "Get the current weather for a city",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "The city name" },
    },
    required: ["city"],
  },
  execute: async ({ city }) => {
    // Simulated weather API — use city to vary seed
    await new Promise((r) => setTimeout(r, 1000));
    const seed = city.length;
    const temperature = Math.round(50 + ((seed * 17) % 40));
    return { temperature };
  },
  render: WeatherToolUI,
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    gap: 4,
  },
  city: {
    fontSize: 15,
    fontWeight: "600",
  },
  temp: {
    fontSize: 32,
    fontWeight: "700",
    color: "#007aff",
  },
  label: {
    fontSize: 13,
  },
});
