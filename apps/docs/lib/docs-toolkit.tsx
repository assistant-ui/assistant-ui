"use client";
import type { Toolkit } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
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
        `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&hourly=temperature_2m&models=jma_seamless`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.hourly?.time && data.hourly.temperature_2m) {
        const now = new Date();
        const nowUtcString = `${now.toISOString().substring(0, 14)}00`;

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
  render: ({ args, result }: any) => {
    const isLoading = !result;
    const error = result?.success === false ? result.error : null;
    const temp = result?.success ? result.temperature : null;

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

    return (
      <ToolCard>
        <ToolCardIcon>
          <CloudSun className="size-4" />
        </ToolCardIcon>
        <ToolCardContent>
          <ToolCardTitle>{args?.query}</ToolCardTitle>
          <ToolCardDescription>
            {temp !== null ? `${temp}°C` : "N/A"}
          </ToolCardDescription>
        </ToolCardContent>
      </ToolCard>
    );
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
