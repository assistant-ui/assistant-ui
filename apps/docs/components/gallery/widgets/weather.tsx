"use client";

import { CloudSun } from "lucide-react";
import {
  WeatherWidget,
  type WeatherWidgetPayload,
} from "@/components/tool-ui/weather-widget/runtime";
import type { ToolRenderProps } from "./types";

export type WeatherArgs = { location: string };
export type WeatherResult = { location: string; widget: WeatherWidgetPayload };

export function WeatherToolUI({
  result,
  status,
}: ToolRenderProps<WeatherArgs, WeatherResult>) {
  if (!result?.widget) {
    return (
      <div className="text-muted-foreground border-border/60 bg-muted/30 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
        <CloudSun className="size-4 animate-pulse" />
        {status?.type === "running" ? "Fetching weather…" : "No weather data"}
      </div>
    );
  }
  return <WeatherWidget {...result.widget} />;
}

const SAMPLE: WeatherResult = {
  location: "San Francisco",
  widget: {
    version: "3.1",
    id: "sample-sf",
    location: { name: "San Francisco" },
    units: { temperature: "fahrenheit" },
    current: {
      conditionCode: "partly-cloudy",
      temperature: 72,
      tempMin: 58,
      tempMax: 74,
      windSpeed: 8,
      precipitationLevel: "none",
      visibility: 16,
    },
    forecast: [
      { label: "Mon", conditionCode: "clear", tempMin: 57, tempMax: 73 },
      {
        label: "Tue",
        conditionCode: "partly-cloudy",
        tempMin: 56,
        tempMax: 71,
      },
      { label: "Wed", conditionCode: "cloudy", tempMin: 55, tempMax: 68 },
      { label: "Thu", conditionCode: "rain", tempMin: 54, tempMax: 64 },
      { label: "Fri", conditionCode: "clear", tempMin: 56, tempMax: 70 },
    ],
    time: { timeBucket: 5 },
    updatedAt: "2026-04-25T16:00:00.000Z",
  },
};

export function WeatherPreview() {
  return (
    <div className="w-full max-w-[340px]">
      <WeatherToolUI args={{ location: SAMPLE.location }} result={SAMPLE} />
    </div>
  );
}
