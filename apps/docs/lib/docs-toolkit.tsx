"use client";
import type { Toolkit } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import {
  WeatherWidget,
  type ForecastDay,
  type PrecipitationLevel,
  type WeatherConditionCode,
} from "@/components/tool-ui/weather-widget/runtime";
import { MapPin, CloudSun, AlertCircle } from "lucide-react";
import { z } from "zod";

// Weather data powered by Open-Meteo (https://open-meteo.com/)
const geocodeLocationTool = {
  description: "Geocode a location using Open-Meteo's geocoding API",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async (args: { query: string }) => {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args.query)}`,
      );
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        throw new Error("No results found");
      }

      // Return the first result
      return {
        success: true,
        result: data?.results?.[0],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to geocode location",
      };
    }
  },
  render: ({ result }: any) => {
    if (result?.error) {
      return (
        <ToolCard variant="error">
          <ToolCardIcon>
            <AlertCircle className="size-4" />
          </ToolCardIcon>
          <ToolCardContent>
            <ToolCardTitle>Geocoding failed</ToolCardTitle>
            <ToolCardDescription>
              {result?.error || "Unknown error"}
            </ToolCardDescription>
          </ToolCardContent>
        </ToolCard>
      );
    }
    if (!result?.result) {
      return (
        <ToolCard>
          <ToolCardIcon loading>
            <MapPin className="size-4" />
          </ToolCardIcon>
          <ToolCardContent>
            <ToolCardTitle>Finding location...</ToolCardTitle>
          </ToolCardContent>
        </ToolCard>
      );
    }

    const { name, latitude, longitude } = result?.result;
    return (
      <ToolCard>
        <ToolCardIcon>
          <MapPin className="size-4" />
        </ToolCardIcon>
        <ToolCardContent>
          <ToolCardTitle>{name}</ToolCardTitle>
          <ToolCardDescription>
            {Math.abs(latitude).toFixed(2)}°{latitude >= 0 ? "N" : "S"},{" "}
            {Math.abs(longitude).toFixed(2)}°{longitude >= 0 ? "E" : "W"}
          </ToolCardDescription>
        </ToolCardContent>
      </ToolCard>
    );
  },
};

const mapOpenMeteoCodeToCondition = (
  code: number,
  windSpeed?: number,
): WeatherConditionCode => {
  if (windSpeed !== undefined && windSpeed >= 45 && code <= 3) return "windy";

  switch (code) {
    case 0:
      return "clear";
    case 1:
    case 2:
      return "partly-cloudy";
    case 3:
      return "overcast";
    case 45:
    case 48:
      return "fog";
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 56:
    case 57:
    case 66:
    case 67:
      return "sleet";
    case 61:
    case 63:
    case 80:
    case 81:
      return "rain";
    case 65:
    case 82:
      return "heavy-rain";
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return "snow";
    case 95:
      return "thunderstorm";
    case 96:
    case 99:
      return "hail";
    default:
      return "cloudy";
  }
};

const mapPrecipitationLevel = (
  precipitation?: number,
): PrecipitationLevel | undefined => {
  if (precipitation === undefined) return undefined;
  if (precipitation <= 0) return "none";
  if (precipitation < 1) return "light";
  if (precipitation < 4) return "moderate";
  return "heavy";
};

const getLocalTimeOfDay = (time?: string): number => {
  if (!time) return new Date().getHours() / 24;
  const [, rawClock = "12:00"] = time.split("T");
  const [hours = "12", minutes = "0"] = rawClock.split(":");
  const parsedHours = Number.parseInt(hours, 10);
  const parsedMinutes = Number.parseInt(minutes, 10);
  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return new Date().getHours() / 24;
  }
  return (parsedHours + parsedMinutes / 60) / 24;
};

const formatForecastLabel = (date: string, index: number): string => {
  if (index === 0) return "Today";
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return `Day ${index + 1}`;
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    parsedDate,
  );
};

const weatherSearchTool = {
  description: "Find the weather in a location given a longitude and latitude",
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
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&timezone=auto&temperature_unit=fahrenheit&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const current = data.current;
      const daily = data.daily;

      if (
        !current ||
        !daily?.time ||
        !daily?.weather_code ||
        !daily?.temperature_2m_max ||
        !daily?.temperature_2m_min
      ) {
        throw new Error("Invalid API response format");
      }

      const forecast: ForecastDay[] = daily.time
        .slice(0, 5)
        .map((date: string, index: number) => ({
          label: formatForecastLabel(date, index),
          conditionCode: mapOpenMeteoCodeToCondition(daily.weather_code[index]),
          tempMin: daily.temperature_2m_min[index],
          tempMax: daily.temperature_2m_max[index],
        }));

      if (forecast.length === 0) {
        throw new Error("No forecast data available");
      }

      return {
        success: true,
        widget: {
          version: "3.1" as const,
          id: `docs-weather-${args.query.toLowerCase().replaceAll(/\W+/g, "-")}`,
          location: { name: args.query },
          units: { temperature: "fahrenheit" as const },
          current: {
            conditionCode: mapOpenMeteoCodeToCondition(
              current.weather_code,
              current.wind_speed_10m,
            ),
            temperature: current.temperature_2m,
            tempMin: daily.temperature_2m_min[0],
            tempMax: daily.temperature_2m_max[0],
            windSpeed: current.wind_speed_10m,
            precipitationLevel: mapPrecipitationLevel(current.precipitation),
          },
          forecast,
          time: {
            localTimeOfDay: getLocalTimeOfDay(current.time),
          },
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch weather",
      };
    }
  },
  render: ({ args, result }: any) => {
    const isLoading = !result;
    const error = result?.success === false ? result.error : null;

    if (error) {
      return (
        <ToolCard variant="error">
          <ToolCardIcon>
            <AlertCircle className="size-4" />
          </ToolCardIcon>
          <ToolCardContent>
            <ToolCardTitle>Weather unavailable</ToolCardTitle>
            <ToolCardDescription>{error}</ToolCardDescription>
          </ToolCardContent>
        </ToolCard>
      );
    }

    if (isLoading) {
      return (
        <ToolCard>
          <ToolCardIcon loading>
            <CloudSun className="size-4" />
          </ToolCardIcon>
          <ToolCardContent>
            <ToolCardTitle>Fetching weather...</ToolCardTitle>
          </ToolCardContent>
        </ToolCard>
      );
    }

    if (!result?.widget) {
      return (
        <ToolCard variant="error">
          <ToolCardIcon>
            <AlertCircle className="size-4" />
          </ToolCardIcon>
          <ToolCardContent>
            <ToolCardTitle>Weather unavailable</ToolCardTitle>
            <ToolCardDescription>
              Missing weather widget payload for {args?.query}
            </ToolCardDescription>
          </ToolCardContent>
        </ToolCard>
      );
    }

    return <WeatherWidget {...result.widget} className="my-2" />;
  },
};

export const docsToolkit: Toolkit = {
  geocode_location: geocodeLocationTool,
  weather_search: weatherSearchTool,
};

// Shared Tool Card Components
const ToolCard = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "error";
}) => (
  <div
    className={cn(
      "my-2 flex items-center gap-3 rounded-lg border px-3 py-2.5",
      variant === "error"
        ? "border-destructive/30 bg-destructive/5"
        : "bg-muted/30",
    )}
  >
    {children}
  </div>
);

const ToolCardIcon = ({
  children,
  loading = false,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) => (
  <div
    className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm",
      loading && "animate-pulse",
    )}
  >
    {children}
  </div>
);

const ToolCardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
);

const ToolCardTitle = ({ children }: { children: React.ReactNode }) => (
  <span className="truncate font-medium text-sm">{children}</span>
);

const ToolCardDescription = ({ children }: { children: React.ReactNode }) => (
  <span className="truncate text-muted-foreground text-xs">{children}</span>
);
