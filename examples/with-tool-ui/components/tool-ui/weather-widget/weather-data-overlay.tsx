"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudHail,
  Wind,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import { cn } from "./_adapter";
import type { ForecastDay, TemperatureUnit, WeatherCondition } from "./schema";
import {
  getSceneBrightnessFromTimeOfDay,
  getTimeOfDay,
  getWeatherTheme,
  useGlassStyles,
  type WeatherTheme,
} from "./effects";

function getPeakIntensity(timeOfDay: number): number {
  const noonDistance = Math.abs(timeOfDay - 0.5);
  const midnightDistance = Math.min(timeOfDay, 1 - timeOfDay);
  const minDistance = Math.min(noonDistance, midnightDistance);
  return Math.max(0, 1 - minDistance * 4);
}

function sineEasedGradient(
  x: number,
  y: number,
  radius: number,
  peakOpacity: number,
  steps = 8,
): string {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const eased = Math.sin((t * Math.PI) / 2);
    const opacity = peakOpacity * (1 - eased);
    const position = t * 100;
    stops.push(
      `rgba(255,255,255,${opacity.toFixed(4)}) ${position.toFixed(1)}%`,
    );
  }
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, ${stops.join(", ")})`;
}

const conditionIcons: Record<WeatherCondition, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  overcast: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  "heavy-rain": CloudRain,
  thunderstorm: CloudLightning,
  snow: Snowflake,
  sleet: CloudHail,
  hail: CloudHail,
  windy: Wind,
};

export interface GlassEffectParams {
  enabled?: boolean;
  depth?: number;
  strength?: number;
  chromaticAberration?: number;
  blur?: number;
  brightness?: number;
  saturation?: number;
}

export interface WeatherDataOverlayProps {
  location: string;
  condition: WeatherCondition;
  temperature: number;
  tempHigh: number;
  tempLow: number;
  humidity?: number;
  windSpeed?: number;
  visibility?: number;
  forecast?: ForecastDay[];
  unit?: TemperatureUnit;
  /**
   * Optional, pre-formatted string like "Updated 5 min ago".
   * Useful when embedding the overlay inside `WeatherWidget`.
   */
  updatedAtLabel?: string;
  /**
   * Provide either `timeOfDay` (0-1) or a `timestamp` ISO string.
   * If neither is provided, defaults to noon (0.5).
   */
  timeOfDay?: number;
  timestamp?: string;
  className?: string;
  /**
   * Glass refraction effect parameters for the forecast card.
   * When enabled, applies SVG displacement filter for realistic glass distortion.
   */
  glassParams?: GlassEffectParams;
}

export function WeatherDataOverlay({
  location,
  condition,
  temperature,
  tempHigh,
  tempLow,
  humidity,
  windSpeed,
  visibility: _visibility,
  forecast = [],
  unit = "fahrenheit",
  updatedAtLabel,
  timeOfDay: timeOfDayProp,
  timestamp,
  className,
  glassParams,
}: WeatherDataOverlayProps) {
  const timeOfDay =
    typeof timeOfDayProp === "number"
      ? timeOfDayProp
      : typeof timestamp === "string"
        ? getTimeOfDay(timestamp)
        : 0.5;

  const [theme, setTheme] = useState<WeatherTheme>("dark");
  const [glowState, setGlowState] = useState<{
    x: number;
    y: number;
    intensity: number;
  }>({ x: 0, y: 0, intensity: 0 });
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Glass effect styles applied directly to forecast container.
  // Enabled by default - falls back to simple blur if SVG filter unsupported.
  const glassEnabled = glassParams?.enabled !== false;
  const glassStyles = useGlassStyles({
    width: cardDimensions.width,
    height: cardDimensions.height,
    depth: glassParams?.depth ?? 3,
    radius: 12,
    strength: glassParams?.strength ?? 75,
    chromaticAberration: glassParams?.chromaticAberration ?? 6,
    blur: glassParams?.blur ?? 1.5,
    brightness: glassParams?.brightness ?? 0.8,
    saturation: glassParams?.saturation ?? 1.3,
    enabled: glassEnabled,
  });

  // Check if SVG glass is active (has backdrop-filter set)
  const svgGlassActive = Boolean(glassStyles.backdropFilter);

  // Track forecast card dimensions for glass effect
  const updateCardDimensions = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCardDimensions({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  }, []);

  useEffect(() => {
    updateCardDimensions();
    const observer = new ResizeObserver(updateCardDimensions);
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [updateCardDimensions]);

  useEffect(() => {
    const brightness = getSceneBrightnessFromTimeOfDay(timeOfDay, condition);
    const newTheme = getWeatherTheme(brightness, theme);
    if (newTheme !== theme) {
      setTheme(newTheme);
    }
  }, [timeOfDay, condition, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const cardRect = cardRef.current.getBoundingClientRect();

      const clampedX = Math.max(
        cardRect.left,
        Math.min(e.clientX, cardRect.right),
      );
      const clampedY = Math.max(
        cardRect.top,
        Math.min(e.clientY, cardRect.bottom),
      );

      const distanceX =
        e.clientX < cardRect.left
          ? cardRect.left - e.clientX
          : e.clientX > cardRect.right
            ? e.clientX - cardRect.right
            : 0;
      const distanceY =
        e.clientY < cardRect.top
          ? cardRect.top - e.clientY
          : e.clientY > cardRect.bottom
            ? e.clientY - cardRect.bottom
            : 0;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      const maxDistance = 150;
      const intensity = Math.max(0, 1 - distance / maxDistance);

      setGlowState({
        x: clampedX - cardRect.left,
        y: clampedY - cardRect.top,
        intensity,
      });
    };

    const handleMouseLeave = () => {
      setGlowState((prev) => ({ ...prev, intensity: 0 }));
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const unitSymbol = unit === "celsius" ? "C" : "F";
  const peakIntensity = getPeakIntensity(timeOfDay);

  const isDark = theme === "dark";
  const textPrimary = isDark ? "text-white" : "text-black";
  const textSecondary = isDark ? "text-white/80" : "text-black/80";
  const textMuted = isDark ? "text-white/50" : "text-black/50";
  const textSubtle = isDark ? "text-white/40" : "text-black/40";

  const baseBgOpacity = isDark ? 0.04 : 0.04;
  const baseBorderOpacity = isDark ? 0.03 : 0.15;
  const bgOpacity = baseBgOpacity * (1 - peakIntensity * 0.7);
  const borderOpacity = baseBorderOpacity + peakIntensity * 0.02;
  const midnightDistance = Math.min(timeOfDay, 1 - timeOfDay);
  const baseBlur = isDark ? 2 + midnightDistance * 38 : 24;
  const blurAmount = isDark
    ? baseBlur
    : baseBlur - peakIntensity * (baseBlur - 8);

  // Dawn intensity peaks around timeOfDay 0.2-0.3 (morning transition)
  const isDawn = timeOfDay > 0.1 && timeOfDay < 0.4;
  const dawnIntensity = isDawn ? 1 - Math.abs(timeOfDay - 0.25) * 4 : 0;
  const forecastTextShadow =
    dawnIntensity > 0
      ? `0 0.5px 1px rgba(0,0,0,${(dawnIntensity * 0.4).toFixed(2)})`
      : undefined;

  const shadowStyle = isDark
    ? "0 1px 8px rgba(0,0,0,0.3)"
    : "0 1px 8px rgba(255,255,255,0.3)";

  const hasStats = humidity !== undefined || windSpeed !== undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-auto absolute inset-0 z-10 flex select-none flex-col p-4",
        className,
      )}
    >
      {/* Top-left: Location */}
      <div className="flex flex-col items-start gap-0.5">
        <h2
          className={cn("font-light text-[15px] tracking-tight", textSecondary)}
          style={{
            fontFamily: '"SF Pro Display", system-ui, sans-serif',
            textShadow: shadowStyle,
          }}
        >
          {location}
        </h2>
        {updatedAtLabel && (
          <p
            className={cn("font-light text-[11px] tracking-tight", textMuted)}
            style={{
              fontFamily: '"SF Pro Display", system-ui, sans-serif',
              textShadow: shadowStyle,
            }}
          >
            {updatedAtLabel}
          </p>
        )}
      </div>

      {/* Spacer - leaves room for celestial in top-right */}
      <div className="flex-1" />

      {/* Bottom-left: Main weather data */}
      <div className="flex flex-col gap-4">
        {/* Hero temperature */}
        <div className="flex flex-col items-start">
          <div className="relative flex items-start">
            <span
              className={cn(
                "font-[200] text-[72px] leading-none tracking-[-0.04em]",
                textPrimary,
              )}
              style={{
                fontFamily:
                  '"SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
                fontFeatureSettings: '"tnum"',
                textShadow: isDark
                  ? "0 2px 20px rgba(0,0,0,0.25)"
                  : "0 2px 20px rgba(255,255,255,0.3)",
              }}
              // aria-label={`${Math.round(temperature)} degrees ${
              //   unit === "celsius" ? "Celsius" : "Fahrenheit"
              // }`}
            >
              {Math.round(temperature)}
            </span>
            <span
              className={cn("mt-2 font-[200] text-[28px]", textMuted)}
              style={{
                fontFamily: '"SF Pro Display", system-ui, sans-serif',
              }}
              aria-hidden="true"
            >
              °{unitSymbol}
            </span>
          </div>

          {/* High / Low range + Stats */}
          <div
            className="mt-2 flex items-center gap-5"
            style={{ fontFamily: '"SF Pro Display", system-ui, sans-serif' }}
          >
            {/* Temperature range with gradient bar */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-light text-[15px] tabular-nums",
                  textSecondary,
                )}
              >
                {Math.round(tempLow)}°
              </span>
              <div
                className="h-[1.5px] w-12 rounded-full"
                style={{
                  background: isDark
                    ? "linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.5) 100%)"
                    : "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)",
                }}
              />
              <span
                className={cn(
                  "font-normal text-[15px] tabular-nums",
                  textPrimary,
                )}
              >
                {Math.round(tempHigh)}°
              </span>
            </div>

            {hasStats && (
              <>
                <div
                  className={cn(
                    "h-3 w-px",
                    isDark ? "bg-white/10" : "bg-black/10",
                  )}
                />

                <div className="flex items-center gap-4">
                  {humidity !== undefined && (
                    <div className="flex items-center gap-1">
                      <Droplets
                        className={cn("size-3", textSubtle)}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "font-light text-[12px] tabular-nums",
                          textMuted,
                        )}
                      >
                        {Math.round(humidity)}%
                      </span>
                    </div>
                  )}
                  {windSpeed !== undefined && (
                    <div className="flex items-center gap-1">
                      <Wind
                        className={cn("size-3", textSubtle)}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "font-light text-[12px] tabular-nums",
                          textMuted,
                        )}
                      >
                        {Math.round(windSpeed)} mph
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Forecast strip - hidden at small container sizes */}
        {forecast.length > 0 && (
          <div ref={cardRef} className="relative @[280px]/weather:block hidden">
            {/* Edge shine - outside overflow-hidden so it aligns with border */}
            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300 ease-out"
              style={{
                opacity: glowState.intensity,
                background: sineEasedGradient(
                  glowState.x,
                  glowState.y,
                  100,
                  isDark ? 0.6 : 1,
                ),
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
                padding: "1px",
              }}
            />
            <div
              className="relative overflow-hidden rounded-xl border p-3"
              style={{
                backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
                borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
                // Apply SVG glass effect when supported, fall back to simple blur
                ...(svgGlassActive
                  ? glassStyles
                  : {
                      backdropFilter: `blur(${blurAmount}px)`,
                      WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    }),
              }}
            >
              {/* Inner glow */}
              <div
                className="pointer-events-none absolute inset-0 mix-blend-color-dodge transition-opacity duration-300 ease-out"
                style={{
                  opacity: glowState.intensity,
                  background: sineEasedGradient(
                    glowState.x,
                    glowState.y,
                    120,
                    isDark ? 0.06 : 0.15,
                  ),
                }}
              />
              <div className="relative flex items-center justify-between">
                {forecast.slice(0, 5).map((day, index) => {
                  const DayIcon = conditionIcons[day.condition];
                  return (
                    <div
                      key={day.day}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-0.5 py-0.5",
                        index === 0 ? "opacity-100" : "opacity-60",
                      )}
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        textShadow: forecastTextShadow,
                      }}
                    >
                      <span
                        className={cn(
                          "font-medium text-[10px] uppercase tracking-[0.1em]",
                          textMuted,
                        )}
                      >
                        {index === 0 ? "Now" : day.day}
                      </span>
                      <DayIcon
                        className={cn("my-0.5 size-5", textSecondary)}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <div className="flex flex-col items-center leading-tight">
                        <span
                          className={cn(
                            "font-normal text-[14px] tabular-nums",
                            textPrimary,
                          )}
                        >
                          {Math.round(day.tempMax)}°
                        </span>
                        <span
                          className={cn(
                            "font-light text-[12px] tabular-nums",
                            textSubtle,
                          )}
                        >
                          {Math.round(day.tempMin)}°
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
