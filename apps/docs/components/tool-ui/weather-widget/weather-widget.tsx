"use client";

import { useEffect, useState } from "react";
import { cn, Card } from "./_adapter";
import { EffectCompositor } from "./effects/effect-compositor";
import {
  getSceneBrightnessFromTimeOfDay,
  getWeatherTheme,
} from "./effects/parameter-mapper";
import { getNearestCheckpoint } from "./effects/tuning";
import { TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES } from "./effects/tuned-presets";
import type { WeatherWidgetProps } from "./schema";
import {
  getWeatherWidgetBackgroundClass,
  getWeatherWidgetMountClass,
} from "./render-state";
import { resolveWeatherTime } from "./time";
import { WeatherDataOverlay } from "./weather-data-overlay";

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
  customEffectProps,
}: WeatherWidgetProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const reducedMotion = effects?.reducedMotion ?? Boolean(prefersReducedMotion);
  const effectsEnabled = effects?.enabled !== false && !reducedMotion;

  const overlayTimeOfDay = customEffectProps?.celestial?.timeOfDay;
  const resolvedTime = resolveWeatherTime({
    time,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
  });
  const timeOfDay =
    typeof overlayTimeOfDay === "number"
      ? overlayTimeOfDay
      : resolvedTime.timeOfDay;

  const tunedOverrides =
    TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES[current.conditionCode];
  const tunedGlass = tunedOverrides?.[getNearestCheckpoint(timeOfDay)]?.glass;
  const glassParams = customEffectProps?.glass
    ? { ...tunedGlass, ...customEffectProps.glass }
    : tunedGlass;
  const brightness = getSceneBrightnessFromTimeOfDay(
    timeOfDay,
    current.conditionCode,
  );
  const weatherTheme = getWeatherTheme(brightness);
  const backgroundClass = getWeatherWidgetBackgroundClass(weatherTheme);

  const compositorProps = {
    conditionCode: current.conditionCode,
    ...(current.windSpeed !== undefined
      ? { windSpeed: current.windSpeed }
      : {}),
    ...(current.precipitationLevel !== undefined
      ? { precipitationLevel: current.precipitationLevel }
      : {}),
    ...(current.visibility !== undefined
      ? { visibility: current.visibility }
      : {}),
    ...(updatedAt !== undefined ? { timestamp: updatedAt } : {}),
    timeOfDay,
    ...(effects !== undefined ? { settings: effects } : {}),
    ...(customEffectProps !== undefined
      ? { customProps: customEffectProps }
      : {}),
  };

  const overlayProps = {
    location: location.name,
    conditionCode: current.conditionCode,
    temperature: current.temperature,
    tempHigh: current.tempMax,
    tempLow: current.tempMin,
    forecast,
    unit: units.temperature,
    theme: weatherTheme,
    timeOfDay,
    ...(updatedAt !== undefined ? { timestamp: updatedAt } : {}),
    ...(glassParams !== undefined ? { glassParams } : {}),
  };

  return (
    <article
      data-slot="weather-widget"
      data-tool-ui-id={id}
      className={cn(
        "w-full max-w-md transition-opacity duration-200",
        getWeatherWidgetMountClass(isMounted),
        className,
      )}
    >
      <Card
        className={cn(
          "@container/weather relative aspect-[4/3] overflow-clip border-0 p-0 shadow-none [container-type:size]",
          backgroundClass,
        )}
      >
        {effectsEnabled && <EffectCompositor {...compositorProps} />}

        <WeatherDataOverlay {...overlayProps} />
      </Card>
    </article>
  );
}
