"use client";

import { cn, Card } from "./_adapter";
import {
  EffectCompositor,
  getSceneBrightnessFromTimeOfDay,
  getTimeOfDay,
  getWeatherTheme,
} from "./effects";
import type { WeatherWidgetProps } from "./schema";
import { WeatherDataOverlay } from "./weather-data-overlay";

function formatRelativeTime(isoString: string, locale?: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -diffMinutes,
      "minute",
    );
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -diffHours,
      "hour",
    );
  }

  const diffDays = Math.floor(diffHours / 24);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -diffDays,
    "day",
  );
}

export function WeatherWidget({
  id,
  location,
  current,
  forecast,
  unit = "celsius",
  updatedAt,
  className,
  locale: localeProp,
  effects,
  customEffectProps,
}: WeatherWidgetProps) {
  const locale =
    localeProp ??
    (typeof navigator !== "undefined" ? navigator.language : undefined);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const reducedMotion = effects?.reducedMotion ?? Boolean(prefersReducedMotion);
  const effectsEnabled = effects?.enabled !== false && !reducedMotion;

  const overlayTimeOfDay = customEffectProps?.celestial?.timeOfDay;
  const timeOfDay =
    typeof overlayTimeOfDay === "number"
      ? overlayTimeOfDay
      : getTimeOfDay(updatedAt);
  const brightness = getSceneBrightnessFromTimeOfDay(
    timeOfDay,
    current.condition,
  );
  const weatherTheme = getWeatherTheme(brightness);
  const isWeatherDark = weatherTheme === "dark";
  const backgroundClass = isWeatherDark
    ? "bg-gradient-to-b from-zinc-950 via-zinc-900/70 to-zinc-950"
    : "bg-gradient-to-b from-sky-50 via-sky-100/70 to-white";

  const updatedAtLabel = updatedAt
    ? `Updated ${formatRelativeTime(updatedAt, locale)}`
    : undefined;

  return (
    <article
      data-slot="weather-widget"
      data-tool-ui-id={id}
      className={cn("@container/weather w-full max-w-md", className)}
    >
      <Card
        className={cn(
          "relative aspect-[4/3] overflow-clip border-0 p-0 shadow-none",
          backgroundClass,
        )}
      >
        {effectsEnabled && (
          <EffectCompositor
            condition={current.condition}
            windSpeed={current.windSpeed}
            windDirection={current.windDirection}
            precipitation={current.precipitation}
            humidity={current.humidity}
            visibility={current.visibility}
            timestamp={updatedAt}
            settings={effects}
            customProps={customEffectProps}
          />
        )}

        <WeatherDataOverlay
          location={location}
          condition={current.condition}
          temperature={current.temp}
          tempHigh={current.tempMax}
          tempLow={current.tempMin}
          humidity={current.humidity}
          windSpeed={current.windSpeed}
          visibility={current.visibility}
          forecast={forecast}
          unit={unit}
          updatedAtLabel={updatedAtLabel}
          timeOfDay={overlayTimeOfDay}
          timestamp={updatedAt}
          glassParams={customEffectProps?.glass}
        />
      </Card>
    </article>
  );
}
