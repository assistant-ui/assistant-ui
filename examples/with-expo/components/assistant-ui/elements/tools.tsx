"use generative";

import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  defineToolkit,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react-native";
import { z } from "zod";
import { useTheme } from "@/hooks/use-theme";
import { Radius } from "@/constants/theme";

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
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  if (code === 95) return "⛈️";
  return "🌩️";
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

function ToolCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

function ToolStatus({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <ToolCard>
      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </ToolCard>
  );
}

function ToolError({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.destructiveSurface,
          borderColor: colors.destructive,
        },
      ]}
    >
      <Text style={[styles.statusText, { color: colors.destructive }]}>
        {label}
      </Text>
    </View>
  );
}

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
  const { colors } = useTheme();

  if (props.status?.type === "running") {
    return <ToolStatus label="Finding location…" />;
  }

  if (props.result?.error) {
    return <ToolError label={`Geocoding failed: ${props.result.error}`} />;
  }

  const result = props.result?.result;
  if (!result) return null;

  return (
    <ToolCard>
      <View style={styles.row}>
        <Text style={styles.pin}>{"📍"}</Text>
        <View>
          <Text style={[styles.locationName, { color: colors.foreground }]}>
            {result.name}
          </Text>
          <Text style={[styles.coords, { color: colors.mutedForeground }]}>
            {Math.abs(result.latitude).toFixed(2)}
            {"°"}
            {result.latitude >= 0 ? "N" : "S"},{" "}
            {Math.abs(result.longitude).toFixed(2)}
            {"°"}
            {result.longitude >= 0 ? "E" : "W"}
          </Text>
        </View>
      </View>
    </ToolCard>
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
  const { colors } = useTheme();

  if (props.status?.type === "running") {
    return <ToolStatus label={`Fetching weather for ${props.args.query}…`} />;
  }

  if (!props.result?.success) {
    return (
      <ToolError
        label={`Weather unavailable: ${props.result?.error ?? "Unknown error"}`}
      />
    );
  }

  const { location, temperature, weatherCode, windSpeed, forecast } =
    props.result;

  return (
    <ToolCard>
      <View style={styles.weatherHeader}>
        <Text style={styles.weatherEmoji}>
          {mapWeatherEmoji(weatherCode ?? 0)}
        </Text>
        <View>
          <Text style={[styles.locationName, { color: colors.foreground }]}>
            {location}
          </Text>
          <Text style={[styles.condition, { color: colors.mutedForeground }]}>
            {mapWeatherCode(weatherCode ?? 0)}
          </Text>
        </View>
      </View>

      <Text style={[styles.tempLarge, { color: colors.foreground }]}>
        {temperature ?? "--"}
        {"°"}F
      </Text>

      {windSpeed != null && (
        <Text style={[styles.wind, { color: colors.mutedForeground }]}>
          Wind: {windSpeed} mph
        </Text>
      )}

      {forecast && forecast.length > 0 && (
        <View style={[styles.forecastRow, { borderTopColor: colors.border }]}>
          {forecast.map((day, i) => (
            <View key={i} style={styles.forecastDay}>
              <Text
                style={[
                  styles.forecastLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                {day.label}
              </Text>
              <Text style={styles.forecastEmoji}>
                {mapWeatherEmoji(day.code)}
              </Text>
              <Text style={[styles.forecastTemp, { color: colors.foreground }]}>
                {day.max}
                {"°"}
              </Text>
              <Text
                style={[
                  styles.forecastTempLow,
                  { color: colors.mutedForeground },
                ]}
              >
                {day.min}
                {"°"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ToolCard>
  );
}

// Toolkit definition

export default defineToolkit({
  geocode_location: {
    description: "Geocode a location using Open-Meteo's geocoding API",
    parameters: z.object({
      query: z.string(),
    }),
    execute: async (args: { query: string }) => {
      "use client";
      return geocodeLocationWithOpenMeteo(args.query);
    },
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
    }) => {
      "use client";
      return fetchWeatherFromOpenMeteo(args);
    },
    render: WeatherToolUI,
  },
});

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
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
    letterSpacing: -1,
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
