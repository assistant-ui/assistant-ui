"use client";
import { useAssistantTool } from "@assistant-ui/react";
import { Sun, Moon, Loader2, MapPin } from "lucide-react";
import { z } from "zod";

// Weather data powered by Open-Meteo (https://open-meteo.com/)
export const GeocodeLocationToolUI = () => {
  useAssistantTool({
    toolName: "geocode_location",
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
            error instanceof Error
              ? error.message
              : "Failed to geocode location",
        };
      }
    },
    render: ({ result }) => {
      if (result?.error) {
        return (
          <div className="bg-muted/50 flex min-h-[68px] items-center gap-3 rounded-md border-2 border-red-400 p-3">
            <span className="text-red-500">⚠️</span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Geocoding Error</span>
              <span className="text-muted-foreground text-sm">
                {result?.error || "Unknown error"}
              </span>
            </div>
          </div>
        );
      }
      if (!result?.result) {
        return (
          <div className="bg-muted/50 flex min-h-[68px] items-center gap-3 rounded-md border-2 border-blue-400 p-3">
            <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-blue-500" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                Geocoding location...
              </span>
              <span className="text-muted-foreground text-sm">
                Please wait while we find your location
              </span>
            </div>
          </div>
        );
      }

      const { name, latitude, longitude } = result?.result;
      return (
        <div className="bg-muted/50 hover:bg-muted/70 flex min-h-[68px] items-center gap-3 rounded-md border-2 border-blue-400 p-3 transition-all duration-300 hover:border-blue-500 hover:shadow-md">
          <MapPin className="h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-muted-foreground text-sm">
              {latitude}°N, {longitude}°E
            </span>
          </div>
        </div>
      );
    },
  });
  return null;
};

export const WeatherSearchToolUI = () => {
  useAssistantTool({
    toolName: "weather_search",
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
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&hourly=temperature_2m&models=jma_seamless`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
          const now = new Date();
          const nowUtcString = now.toISOString().substring(0, 14) + "00";

          let currentHourIndex = data.hourly.time.findIndex(
            (t: string) => t >= nowUtcString,
          );

          currentHourIndex =
            currentHourIndex > 0
              ? currentHourIndex - 1
              : currentHourIndex === -1
                ? data.hourly.time.length - 1
                : 0;

          const currentTemp = data.hourly.temperature_2m[currentHourIndex];

          return {
            success: true,
            temperature: currentTemp,
            timestamp: data.hourly.time[currentHourIndex],
          };
        } else {
          throw new Error("Invalid API response format");
        }
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch weather",
        };
      }
    },
    render: ({ args, result }) => {
      const isLoading = !result;
      const error = result?.success === false ? result.error : null;
      const temp = result?.success ? result.temperature : null;
      const isDay = result?.success
        ? new Date(result.timestamp).getHours() >= 6 &&
          new Date(result.timestamp).getHours() < 18
        : true;

      return (
        <div className="bg-muted/50 hover:bg-muted/70 mt-4 flex min-h-[68px] items-center gap-3 rounded-md border-2 border-blue-400 p-3 transition-all duration-300 hover:border-blue-500 hover:shadow-md">
          {isLoading ? (
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          ) : error ? (
            <span className="text-red-500">⚠️</span>
          ) : isDay ? (
            <Sun className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 flex-shrink-0 text-blue-300" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {isLoading
                ? "Searching for weather..."
                : error
                  ? "Error Fetching Weather"
                  : `Weather in ${args?.query}`}
            </span>
            <span className="text-muted-foreground text-sm">
              {isLoading
                ? "Loading..."
                : error
                  ? error
                  : temp !== null
                    ? `${temp}°C`
                    : "N/A"}
            </span>
          </div>
        </div>
      );
    },
  });
  return null;
};
