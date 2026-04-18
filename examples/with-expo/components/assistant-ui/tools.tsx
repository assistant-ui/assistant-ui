import { View, Text, StyleSheet, useColorScheme } from "react-native";
import type {
  Toolkit,
  ToolCallMessagePartProps,
} from "@assistant-ui/react-native";
import { z } from "zod";

// Open-Meteo API adapters (free, no API key needed)

const geocodeLocationWithOpenMeteo = async (query: string) => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`,
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!data.results || data.results.length === 0)
      throw new Error("No results found");
    return { success: true as const, result: data.results[0] };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to geocode location",
    };
  }
};

const mapWeatherCode = (code: number): string => {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow Showers";
  if (code === 95) return "Thunderstorm";
  return "Stormy";
};

const mapWeatherEmoji = (code: number): string => {
  if (code === 0) return "\u2600\uFE0F";
  if (code <= 3) return "\u26C5";
  if (code <= 48) return "\uD83C\uDF2B\uFE0F";
  if (code <= 57) return "\uD83C\uDF26\uFE0F";
  if (code <= 67) return "\uD83C\uDF27\uFE0F";
  if (code <= 77) return "\u2744\uFE0F";
  if (code <= 82) return "\uD83C\uDF26\uFE0F";
  if (code <= 86) return "\uD83C\uDF28\uFE0F";
  if (code === 95) return "\u26C8\uFE0F";
  return "\uD83C\uDF29\uFE0F";
};

const fetchWeatherFromOpenMeteo = async ({
  query,
  longitude,
  latitude,
}: {
  query: string;
  longitude: number;
  latitude: number;
}) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto&temperature_unit=fahrenheit&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5`,
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const current = data.current;
    const daily = data.daily;
    if (!current || !daily?.time) throw new Error("Invalid API response");

    const forecast = daily.time.slice(0, 5).map((date: string, i: number) => {
      const d = new Date(`${date}T12:00:00Z`);
      const label =
        i === 0
          ? "Today"
          : new Intl.DateTimeFormat("en-US", {
              weekday: "short",
              timeZone: "UTC",
            }).format(d);
      return {
        label,
        code: daily.weather_code[i],
        min: Math.round(daily.temperature_2m_min[i]),
        max: Math.round(daily.temperature_2m_max[i]),
      };
    });

    return {
      success: true as const,
      location: query,
      temperature: Math.round(current.temperature_2m),
      weatherCode: current.weather_code,
      windSpeed: Math.round(current.wind_speed_10m),
      forecast,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch weather",
    };
  }
};

// Tool UI Components

function GeocodeToolUI(
  props: ToolCallMessagePartProps<
    { query: string },
    {
      success: boolean;
      result?: { name: string; latitude: number; longitude: number };
      error?: string;
    }
  >,
) {
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
          Finding location...
        </Text>
      </View>
    );
  }

  if (props.result?.error) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#3a1c1c" : "#fff0f0" },
        ]}
      >
        <Text style={[styles.label, { color: "#ff453a" }]}>
          Geocoding failed: {props.result.error}
        </Text>
      </View>
    );
  }

  const result = props.result?.result;
  if (!result) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: isDark ? "#1c1c1e" : "#f2f2f7" }]}
    >
      <View style={styles.row}>
        <Text style={styles.pin}>{"\uD83D\uDCCD"}</Text>
        <View>
          <Text
            style={[
              styles.locationName,
              { color: isDark ? "#ffffff" : "#000000" },
            ]}
          >
            {result.name}
          </Text>
          <Text
            style={[styles.coords, { color: isDark ? "#8e8e93" : "#6e6e73" }]}
          >
            {Math.abs(result.latitude).toFixed(2)}
            {"\u00B0"}
            {result.latitude >= 0 ? "N" : "S"},{" "}
            {Math.abs(result.longitude).toFixed(2)}
            {"\u00B0"}
            {result.longitude >= 0 ? "E" : "W"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function WeatherToolUI(
  props: ToolCallMessagePartProps<
    { query: string; longitude: number; latitude: number },
    {
      success: boolean;
      location?: string;
      temperature?: number;
      weatherCode?: number;
      windSpeed?: number;
      forecast?: Array<{
        label: string;
        code: number;
        min: number;
        max: number;
      }>;
      error?: string;
    }
  >,
) {
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
          Fetching weather for {props.args.query}...
        </Text>
      </View>
    );
  }

  if (!props.result?.success) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#3a1c1c" : "#fff0f0" },
        ]}
      >
        <Text style={[styles.label, { color: "#ff453a" }]}>
          Weather unavailable: {props.result?.error ?? "Unknown error"}
        </Text>
      </View>
    );
  }

  const { location, temperature, weatherCode, windSpeed, forecast } =
    props.result;

  return (
    <View
      style={[
        styles.weatherCard,
        { backgroundColor: isDark ? "#1c1c1e" : "#f2f2f7" },
      ]}
    >
      <View style={styles.weatherHeader}>
        <Text style={styles.weatherEmoji}>
          {mapWeatherEmoji(weatherCode ?? 0)}
        </Text>
        <View>
          <Text
            style={[
              styles.locationName,
              { color: isDark ? "#ffffff" : "#000000" },
            ]}
          >
            {location}
          </Text>
          <Text
            style={[
              styles.condition,
              { color: isDark ? "#8e8e93" : "#6e6e73" },
            ]}
          >
            {mapWeatherCode(weatherCode ?? 0)}
          </Text>
        </View>
      </View>

      <Text style={styles.tempLarge}>
        {temperature ?? "--"}
        {"\u00B0"}F
      </Text>

      {windSpeed != null && (
        <Text style={[styles.wind, { color: isDark ? "#8e8e93" : "#6e6e73" }]}>
          Wind: {windSpeed} mph
        </Text>
      )}

      {forecast && forecast.length > 0 && (
        <View
          style={[
            styles.forecastRow,
            {
              borderTopColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
            },
          ]}
        >
          {forecast.map((day, i) => (
            <View key={i} style={styles.forecastDay}>
              <Text
                style={[
                  styles.forecastLabel,
                  { color: isDark ? "#8e8e93" : "#6e6e73" },
                ]}
              >
                {day.label}
              </Text>
              <Text style={styles.forecastEmoji}>
                {mapWeatherEmoji(day.code)}
              </Text>
              <Text
                style={[
                  styles.forecastTemp,
                  { color: isDark ? "#ffffff" : "#000000" },
                ]}
              >
                {day.max}
                {"\u00B0"}
              </Text>
              <Text
                style={[
                  styles.forecastTempLow,
                  { color: isDark ? "#8e8e93" : "#6e6e73" },
                ]}
              >
                {day.min}
                {"\u00B0"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Toolkit definition

export const expoToolkit: Toolkit = {
  geocode_location: {
    description: "Geocode a location using Open-Meteo's geocoding API",
    parameters: z.object({
      query: z.string(),
    }),
    execute: async (args: { query: string }) =>
      geocodeLocationWithOpenMeteo(args.query),
    render: GeocodeToolUI,
  },
  weather_search: {
    description:
      "Find the weather in a location given a longitude and latitude",
    parameters: z.object({
      query: z.string(),
      longitude: z.number(),
      latitude: z.number(),
    }),
    execute: async (args: {
      query: string;
      longitude: number;
      latitude: number;
    }) => fetchWeatherFromOpenMeteo(args),
    render: WeatherToolUI,
  },
};

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  weatherCard: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pin: {
    fontSize: 20,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "600",
  },
  coords: {
    fontSize: 13,
    marginTop: 2,
  },
  label: {
    fontSize: 13,
  },
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  weatherEmoji: {
    fontSize: 32,
  },
  condition: {
    fontSize: 13,
    marginTop: 2,
  },
  tempLarge: {
    fontSize: 40,
    fontWeight: "700",
    color: "#007aff",
  },
  wind: {
    fontSize: 13,
    marginTop: 2,
  },
  forecastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  forecastDay: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  forecastLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  forecastEmoji: {
    fontSize: 18,
  },
  forecastTemp: {
    fontSize: 13,
    fontWeight: "600",
  },
  forecastTempLow: {
    fontSize: 12,
  },
});
