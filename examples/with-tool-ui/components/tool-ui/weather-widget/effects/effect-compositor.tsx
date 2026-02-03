"use client";

import { useMemo, useState, useEffect } from "react";
import type { WeatherCondition } from "../schema";
import type { EffectLayerConfig, EffectSettings } from "./types";
import {
  mapWeatherToEffects,
  configToCloudProps,
  configToRainProps,
  configToLightningProps,
  configToSnowProps,
  configToCelestialProps,
} from "./parameter-mapper";
import {
  WeatherEffectsCanvas,
  type LayerToggles,
  type WeatherEffectsCanvasProps,
} from "./weather-effects-canvas";
import { TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES } from "./tuned-presets";
import { applyWeatherEffectsOverrides, getNearestCheckpoint } from "./tuning";

function sunAltitudeToLightIntensity(sunAltitude: number): number {
  // Mirrors the solar contribution curve used by getSceneBrightness.
  const light =
    sunAltitude < 0
      ? 0.05 + (1 + sunAltitude) * 0.1
      : 0.15 + sunAltitude * 0.85;
  return Math.max(0, Math.min(1, light));
}

function mapEffectConfigToCanvasProps(
  config: EffectLayerConfig,
): WeatherEffectsCanvasProps {
  const celestial = configToCelestialProps(config) ?? undefined;
  const rain = configToRainProps(config) ?? undefined;
  const snow = configToSnowProps(config) ?? undefined;
  const lightningBase = configToLightningProps(config) ?? undefined;
  const cloudBase = configToCloudProps(config) ?? undefined;

  const cloud: WeatherEffectsCanvasProps["cloud"] = cloudBase
    ? {
        coverage: cloudBase.coverage,
        density: 0.5 + cloudBase.coverage * 0.5,
        windSpeed: cloudBase.windSpeed,
        turbulence: cloudBase.turbulence,
        ambientDarkness: cloudBase.ambientDarkness,
        lightIntensity: sunAltitudeToLightIntensity(cloudBase.sunAltitude),
      }
    : undefined;

  const lightning: WeatherEffectsCanvasProps["lightning"] = config.lightning
    ? {
        enabled: config.lightning.enabled,
        autoMode: lightningBase?.autoMode ?? config.lightning.autoTrigger,
        autoInterval:
          lightningBase?.autoInterval ??
          (config.lightning.intervalMin + config.lightning.intervalMax) / 2,
      }
    : undefined;

  const layers: Partial<LayerToggles> = {
    celestial: Boolean(celestial),
    clouds: Boolean(cloud),
    rain: Boolean(config.rain),
    lightning: Boolean(config.lightning?.enabled),
    snow: Boolean(config.snow),
  };

  return { layers, celestial, cloud, rain, lightning, snow };
}

function mapCustomEffectPropsToCanvasProps(
  custom: CustomEffectProps,
): WeatherEffectsCanvasProps | null {
  const layerOverrides = custom.layers;

  const hasCelestial =
    layerOverrides?.celestial !== false && custom.celestial !== undefined;
  const hasCloud =
    layerOverrides?.clouds !== false && custom.cloud !== undefined;
  const hasRain = layerOverrides?.rain !== false && custom.rain !== undefined;
  const hasLightning =
    layerOverrides?.lightning !== false && custom.lightning !== undefined;
  const hasSnow = layerOverrides?.snow !== false && custom.snow !== undefined;

  if (!hasCelestial && !hasCloud && !hasRain && !hasLightning && !hasSnow) {
    return null;
  }

  const layers: Partial<LayerToggles> = {
    celestial: hasCelestial,
    clouds: hasCloud,
    rain: hasRain,
    lightning: hasLightning,
    snow: hasSnow,
  };

  const celestial: WeatherEffectsCanvasProps["celestial"] = hasCelestial
    ? custom.celestial
    : undefined;

  const cloud: WeatherEffectsCanvasProps["cloud"] =
    hasCloud && custom.cloud
      ? {
          coverage: custom.cloud.coverage,
          density: custom.cloud.density,
          softness: custom.cloud.softness,
          cloudScale: custom.cloud.cloudScale,
          windSpeed: custom.cloud.windSpeed,
          windAngle: custom.cloud.windAngle,
          turbulence: custom.cloud.turbulence,
          lightIntensity:
            custom.cloud.lightIntensity ??
            sunAltitudeToLightIntensity(custom.cloud.sunAltitude),
          ambientDarkness: custom.cloud.ambientDarkness,
          numLayers: custom.cloud.numLayers,
        }
      : undefined;

  const rain: WeatherEffectsCanvasProps["rain"] =
    hasRain && custom.rain
      ? {
          glassIntensity: custom.rain.glassIntensity,
          glassZoom: custom.rain.zoom,
          fallingIntensity: custom.rain.fallingIntensity,
          fallingSpeed: custom.rain.fallingSpeed,
          fallingAngle: custom.rain.fallingAngle,
          fallingStreakLength: custom.rain.fallingStreakLength,
          fallingLayers: custom.rain.fallingLayers,
        }
      : undefined;

  const lightning: WeatherEffectsCanvasProps["lightning"] =
    hasLightning && custom.lightning
      ? {
          enabled: true,
          autoMode: custom.lightning.autoMode,
          autoInterval: custom.lightning.autoInterval,
          flashIntensity: custom.lightning.glowIntensity,
          branchDensity: custom.lightning.branchDensity,
        }
      : undefined;

  const snow: WeatherEffectsCanvasProps["snow"] =
    hasSnow && custom.snow
      ? {
          intensity: custom.snow.intensity,
          layers: custom.snow.layers,
          fallSpeed: custom.snow.fallSpeed,
          windSpeed: custom.snow.windSpeed,
          drift: custom.snow.drift,
          flakeSize: custom.snow.flakeSize,
        }
      : undefined;

  const interactions: Partial<
    NonNullable<WeatherEffectsCanvasProps["interactions"]>
  > = {};
  if (custom.rain?.fallingRefraction !== undefined) {
    interactions.rainRefractionStrength = custom.rain.fallingRefraction;
  }
  if (custom.lightning?.sceneIllumination !== undefined) {
    interactions.lightningSceneIllumination =
      custom.lightning.sceneIllumination;
  }

  return {
    layers,
    celestial,
    cloud,
    rain,
    lightning,
    snow,
    interactions:
      Object.keys(interactions).length > 0 ? interactions : undefined,
  };
}

/**
 * Custom effect layer props for direct control.
 * When provided, these override the auto-calculated values from mapWeatherToEffects.
 */
export interface CustomEffectProps {
  layers?: {
    celestial?: boolean;
    clouds?: boolean;
    rain?: boolean;
    lightning?: boolean;
    snow?: boolean;
  };
  celestial?: {
    timeOfDay: number;
    moonPhase: number;
    starDensity: number;
    celestialX: number;
    celestialY: number;
    sunSize: number;
    moonSize: number;
    sunGlowIntensity: number;
    sunGlowSize: number;
    sunRayCount: number;
    sunRayLength: number;
    sunRayIntensity: number;
    /**
     * Scales subtle, noise-driven ray motion (shimmer + slow "breathing").
     * 0 disables motion; 1 is the default subtlety; >1 increases visibility.
     */
    sunRayShimmer?: number;
    /**
     * Global speed multiplier for the ray shimmer/breath noise inputs.
     * 1 is the default speed; >1 speeds up motion.
     */
    sunRayShimmerSpeed?: number;
    moonGlowIntensity: number;
    moonGlowSize: number;
  };
  cloud?: {
    cloudScale?: number;
    coverage: number;
    density?: number;
    softness?: number;
    windSpeed: number;
    windAngle?: number;
    turbulence: number;
    sunAltitude: number;
    sunAzimuth?: number;
    lightIntensity?: number;
    ambientDarkness: number;
    numLayers?: number;
    layerSpread?: number;
    starDensity: number;
    starSize?: number;
    starTwinkleSpeed?: number;
    starTwinkleAmount?: number;
    horizonLine?: number;
  };
  rain?: {
    glassIntensity: number;
    zoom?: number;
    fallingIntensity: number;
    fallingSpeed?: number;
    fallingAngle: number;
    fallingStreakLength?: number;
    fallingLayers?: number;
    fallingRefraction?: number;
    fallingWaviness?: number;
    fallingThicknessVar?: number;
  };
  lightning?: {
    branchDensity?: number;
    displacement?: number;
    glowIntensity?: number;
    flashDuration?: number;
    sceneIllumination?: number;
    afterglowPersistence?: number;
    autoMode: boolean;
    autoInterval: number;
  };
  snow?: {
    intensity: number;
    layers?: number;
    fallSpeed?: number;
    windSpeed: number;
    windAngle?: number;
    turbulence?: number;
    drift: number;
    flutter?: number;
    windShear?: number;
    flakeSize?: number;
    sizeVariation?: number;
    opacity?: number;
    glowAmount?: number;
    sparkle?: number;
    visibility?: number;
  };
  glass?: {
    enabled?: boolean;
    depth?: number;
    strength?: number;
    chromaticAberration?: number;
    blur?: number;
    brightness?: number;
    saturation?: number;
  };
}

interface EffectCompositorProps {
  condition: WeatherCondition;
  windSpeed?: number;
  windDirection?: number;
  precipitation?: "none" | "light" | "moderate" | "heavy";
  humidity?: number;
  visibility?: number;
  timestamp?: string;
  settings?: EffectSettings;
  className?: string;
  /**
   * Custom effect props for direct control over all effect parameters.
   * When provided, these override the auto-calculated values.
   */
  customProps?: CustomEffectProps;
}

export function EffectCompositor({
  condition,
  windSpeed,
  windDirection,
  precipitation,
  humidity,
  visibility,
  timestamp,
  settings,
  className,
  customProps,
}: EffectCompositorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const enabled = settings?.enabled !== false;
  const reducedMotion = settings?.reducedMotion ?? false;
  const hasCustomProps = customProps !== undefined;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    const base = window.devicePixelRatio || 1;
    const quality = settings?.quality ?? "auto";

    // Keep high-density screens from exploding GPU cost by default.
    const cap =
      quality === "low"
        ? 1.0
        : quality === "medium"
          ? 1.5
          : quality === "high"
            ? 2.0
            : window.innerWidth < 768
              ? 1.5
              : 2.0;

    return Math.max(1, Math.min(base, cap));
  }, [settings?.quality]);

  const effectConfig = useMemo(() => {
    if (!enabled || hasCustomProps) return null;

    return mapWeatherToEffects({
      condition,
      windSpeed,
      windDirection,
      precipitation,
      humidity,
      visibility,
      timestamp,
    });
  }, [
    condition,
    windSpeed,
    windDirection,
    precipitation,
    humidity,
    visibility,
    timestamp,
    enabled,
    hasCustomProps,
  ]);

  const canvasProps = useMemo<WeatherEffectsCanvasProps | null>(() => {
    if (!enabled || reducedMotion) return null;

    if (hasCustomProps && customProps) {
      return mapCustomEffectPropsToCanvasProps(customProps);
    }

    if (!effectConfig) return null;
    const base = mapEffectConfigToCanvasProps(effectConfig);

    const tuned = TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES[condition];
    const timeOfDay = effectConfig.celestial?.timeOfDay;
    if (!tuned || timeOfDay === undefined) return base;

    const checkpoint = getNearestCheckpoint(timeOfDay);
    const overrides = tuned[checkpoint];
    return applyWeatherEffectsOverrides(base, overrides);
  }, [
    enabled,
    reducedMotion,
    hasCustomProps,
    customProps,
    effectConfig,
    condition,
  ]);

  if (!isMounted || !enabled || reducedMotion || !canvasProps) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: "inherit",
      }}
      aria-hidden="true"
    >
      <WeatherEffectsCanvas
        className="absolute inset-0"
        dpr={dpr}
        {...canvasProps}
      />
    </div>
  );
}
