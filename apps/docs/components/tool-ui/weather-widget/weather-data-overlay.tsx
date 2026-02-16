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
  type LucideIcon,
} from "lucide-react";
import { cn } from "./_adapter";
import type {
  ForecastDay,
  TemperatureUnit,
  WeatherConditionCode,
} from "./schema";
import {
  getSceneBrightnessFromTimeOfDay,
  getTimeOfDay,
  getWeatherTheme,
  type WeatherTheme,
} from "./effects/parameter-mapper";
import { resolveGlassBackdropFilterStyles } from "./effects/glass-style-resolver";
import { useGlassStyles } from "./effects/glass-panel-svg";

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

const conditionIcons: Record<WeatherConditionCode, LucideIcon> = {
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
  conditionCode: WeatherConditionCode;
  temperature: number;
  tempHigh: number;
  tempLow: number;
  forecast?: ForecastDay[];
  unit?: TemperatureUnit;
  theme?: WeatherTheme;
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

export function observeCardDimensions(
  element: HTMLDivElement | null,
  onResize: () => void,
): () => void {
  if (!element || typeof ResizeObserver !== "function") {
    return () => {};
  }

  const observer = new ResizeObserver(onResize);
  observer.observe(element);
  return () => observer.disconnect();
}

export function WeatherDataOverlay({
  location,
  conditionCode,
  temperature,
  tempHigh,
  tempLow,
  forecast = [],
  unit = "fahrenheit",
  theme: themeProp,
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
    return observeCardDimensions(cardRef.current, updateCardDimensions);
  }, [updateCardDimensions]);

  const theme =
    themeProp ??
    getWeatherTheme(getSceneBrightnessFromTimeOfDay(timeOfDay, conditionCode));

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
  const textPrimarySoft = isDark ? "text-white/90" : "text-black/85";
  const textSecondary = isDark ? "text-white/80" : "text-black/80";
  const textSubtle = isDark ? "text-white/40" : "text-black/40";

  const baseBgOpacity = isDark ? 0.04 : 0.04;
  const bgOpacity = baseBgOpacity * (1 - peakIntensity * 0.7);
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

  // Fluid type scales with the widget container size. (Requires container-type:size.)
  const locationFontSize = "clamp(13px, 7.5cqmin, 17px)";
  const temperatureFontSize = "clamp(48px, 32cqmin, 72px)";
  const degreeFontSize = "clamp(18px, 12cqmin, 28px)";
  const hiLoFontSize = "clamp(11px, 6.5cqmin, 15px)";
  const forecastFontFamily =
    '"SF Pro Text", Inter, "Noto Sans", system-ui, sans-serif';

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-auto absolute inset-0 z-10 flex select-none flex-col",
        className,
      )}
    >
      {/* Current weather (more inset than forecast strip) */}
      <div className="px-6 pt-6">
        <div className="flex flex-col items-start">
          <h2
            className={cn(
              "font-medium leading-[1.08] tracking-tight",
              textSecondary,
            )}
            style={{
              fontSize: locationFontSize,
              fontFamily: forecastFontFamily,
              textShadow: shadowStyle,
            }}
          >
            {location}
          </h2>

          <div className="-mt-0.5 flex items-start gap-1">
            <span
              className={cn(
                "font-[250] tabular-nums leading-[1.02] tracking-[-0.015em]",
                textPrimarySoft,
              )}
              style={{
                fontSize: temperatureFontSize,
                fontFamily: forecastFontFamily,
                fontFeatureSettings: '"tnum" 1, "case" 1',
                textShadow: isDark
                  ? "0 2px 20px rgba(0,0,0,0.25)"
                  : "0 2px 20px rgba(255,255,255,0.3)",
              }}
            >
              {Math.round(temperature)}
            </span>
            <span
              className={cn("mt-2 font-[250] tabular-nums", textSecondary)}
              style={{
                fontSize: degreeFontSize,
                fontFamily: forecastFontFamily,
                fontFeatureSettings: '"tnum" 1, "case" 1',
              }}
              aria-hidden="true"
            >
              °{unitSymbol}
            </span>
          </div>

          <div
            className="mt-0.5 flex items-center gap-3"
            style={{
              fontFamily: forecastFontFamily,
              fontFeatureSettings: '"tnum" 1, "case" 1',
            }}
          >
            <span
              className="font-medium tabular-nums"
              style={{ fontSize: hiLoFontSize }}
            >
              <span className={textSubtle}>H </span>
              <span className={textPrimary}>{Math.round(tempHigh)}°</span>
            </span>
            <span
              className="font-medium tabular-nums"
              style={{ fontSize: hiLoFontSize }}
            >
              <span className={textSubtle}>L </span>
              <span className={textPrimary}>{Math.round(tempLow)}°</span>
            </span>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Forecast strip - hidden at small container sizes (less inset than header) */}
      {forecast.length > 0 && (
        <div className="px-3 pb-3">
          {/* Show the strip earlier, but progressively reduce content as height shrinks. */}
          <div ref={cardRef} className="weather-forecast-strip relative hidden">
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
                padding: "0.5px",
              }}
            />
            <div
              className="relative overflow-hidden rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
                ...resolveGlassBackdropFilterStyles({
                  glassStyles,
                  blurAmount,
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
                  const DayIcon = conditionIcons[day.conditionCode];
                  return (
                    <div
                      key={`${day.label}-${index}`}
                      className="flex flex-1 flex-col items-center gap-0.5"
                      style={{
                        fontFamily: forecastFontFamily,
                        fontFeatureSettings: '"tnum" 1, "case" 1',
                        textShadow: forecastTextShadow,
                      }}
                    >
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-[0.08em]",
                          index === 0 ? "font-semibold" : "font-medium",
                          textPrimary,
                        )}
                      >
                        {day.label}
                      </span>
                      <DayIcon
                        className={cn(
                          "my-0.5 size-5",
                          textPrimary,
                          index === 0 ? "opacity-100" : "opacity-70",
                          // At shorter containers (but still showing the strip),
                          // omit the icon to preserve legibility.
                          "weather-forecast-icon hidden",
                        )}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={cn(
                            "text-[15px] tabular-nums leading-[1.2] tracking-[-0.01em]",
                            index === 0 ? "font-semibold" : "font-medium",
                            textPrimary,
                          )}
                        >
                          {Math.round(day.tempMax)}°
                        </span>
                        <span
                          className={cn(
                            "font-normal text-[12px] tabular-nums leading-[1.3]",
                            textPrimary,
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
        </div>
      )}

      {/* Height-based container queries (requires container-type:size on the weather container). */}
      <style>{`
        @container weather (min-height: 245px) {
          .weather-forecast-strip {
            display: block !important;
          }
        }
        @container weather (min-height: 280px) {
          .weather-forecast-icon {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
