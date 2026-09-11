"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CloudSun, Loader2, TriangleAlert, Wind } from "lucide-react";

type WeatherArgs = {
  location: string;
  latitude: number;
  longitude: number;
};

type WeatherResult =
  | {
      success: true;
      location: string;
      widget: {
        units: { temperature: "celsius" | "fahrenheit"; windSpeed: string };
        current: {
          temperature: number;
          conditionCode: string;
          windSpeed: number;
        };
      };
    }
  | { success: false; error: string };

export const WeatherCard: ToolCallMessagePartComponent<
  WeatherArgs,
  WeatherResult
> = ({ args, result, status }) => {
  if (status.type === "running" || !result) {
    return (
      <div className="my-3 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
        <Loader2 className="size-5 animate-spin" />
        Checking weather in {args.location}…
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="my-3 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
        <TriangleAlert className="size-5" />
        {result.error}
      </div>
    );
  }

  const { current, units } = result.widget;
  const degree = units.temperature === "celsius" ? "C" : "F";

  return (
    <div className="my-3 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-5 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/75">Current weather</p>
          <h3 className="mt-1 text-xl font-semibold">{result.location}</h3>
        </div>
        <CloudSun className="size-8 text-amber-200" />
      </div>
      <p className="mt-6 text-5xl font-semibold tracking-tight">
        {Math.round(current.temperature)}°{degree}
      </p>
      <div className="mt-4 flex items-center justify-between text-sm text-white/85">
        <span>{current.conditionCode}</span>
        <span className="flex items-center gap-1.5">
          <Wind className="size-4" />
          {current.windSpeed} {units.windSpeed}
        </span>
      </div>
    </div>
  );
};
