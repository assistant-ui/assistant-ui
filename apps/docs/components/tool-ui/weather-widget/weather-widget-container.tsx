"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  EffectCompositorRuntime,
  getNearestCheckpoint,
  getSceneBrightnessFromTimeOfDay,
  getWeatherTheme,
  resolveWeatherTime,
  TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES,
} from "./generated/weather-runtime-core.generated";
import type { WeatherWidgetRuntimeProps } from "./schema-runtime";
import { WeatherDataOverlay } from "./weather-data-overlay";

type TimeCheckpoint = "dawn" | "noon" | "dusk" | "midnight";

export function WeatherWidget({
  version: _version,
  id,
  location,
  units,
  current,
  forecast,
  time,
  updatedAt,
  className,
  effects,
}: WeatherWidgetRuntimeProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
    );
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQueryList = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    setPrefersReducedMotion(mediaQueryList.matches);

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleMotionPreferenceChange);
      return () => {
        mediaQueryList.removeEventListener(
          "change",
          handleMotionPreferenceChange,
        );
      };
    }

    mediaQueryList.addListener(handleMotionPreferenceChange);
    return () => {
      mediaQueryList.removeListener(handleMotionPreferenceChange);
    };
  }, []);

  const reducedMotion = effects?.reducedMotion ?? prefersReducedMotion;
  const effectsEnabled = effects?.enabled !== false && !reducedMotion;

  const resolvedTime = resolveWeatherTime({
    time,
    updatedAt,
  });
  const timeOfDay = resolvedTime.timeOfDay;
  const tunedOverrides =
    TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES[current.conditionCode];
  const checkpoint = getNearestCheckpoint(timeOfDay) as TimeCheckpoint;
  const checkpointOverrides = tunedOverrides?.[checkpoint];
  const glassParams =
    checkpointOverrides && "glass" in checkpointOverrides
      ? checkpointOverrides.glass
      : undefined;
  const brightness = getSceneBrightnessFromTimeOfDay(
    timeOfDay,
    current.conditionCode,
  );
  const weatherTheme = getWeatherTheme(brightness, undefined);
  const isWeatherDark = weatherTheme === "dark";
  const backgroundClass = isWeatherDark
    ? "bg-gradient-to-b from-zinc-950 via-zinc-900/70 to-zinc-950"
    : "bg-gradient-to-b from-sky-50 via-sky-100/70 to-white";

  return (
    <article
      data-slot="weather-widget"
      data-tool-ui-id={id}
      className={cn("w-full max-w-md", className)}
    >
      <div
        data-slot="card"
        className={cn(
          "@container/weather relative aspect-[4/3] overflow-clip rounded-2xl border-0 p-0 shadow-none [container-type:size]",
          backgroundClass,
        )}
      >
        {effectsEnabled && (
          <EffectCompositorRuntime
            className="absolute inset-0"
            conditionCode={current.conditionCode}
            windSpeed={current.windSpeed}
            precipitationLevel={current.precipitationLevel}
            visibility={current.visibility}
            timestamp={updatedAt}
            timeOfDay={timeOfDay}
            settings={effects}
          />
        )}

        <WeatherDataOverlay
          location={location.name}
          conditionCode={current.conditionCode}
          temperature={current.temperature}
          tempHigh={current.tempMax}
          tempLow={current.tempMin}
          forecast={forecast}
          unit={units.temperature}
          theme={weatherTheme}
          timeOfDay={timeOfDay}
          timestamp={updatedAt}
          glassParams={glassParams}
          reducedMotion={reducedMotion}
        />
      </div>
    </article>
  );
}
