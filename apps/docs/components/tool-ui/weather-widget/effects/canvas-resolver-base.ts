import { getTimeOfDay, mapWeatherToEffects } from "./parameter-mapper";
import type { WeatherEffectParams } from "./types";
import type { WeatherEffectsCanvasProps } from "./weather-effects-types";
import type {
  WeatherCompositorParams,
  WeatherStudioCompositorParams,
} from "./weather-compositor-types";

export type { WeatherStudioCompositorParams } from "./weather-compositor-types";

export function createStudioTimestamp(
  timeOfDay: number,
  referenceTimestamp?: string,
): string {
  const reference = referenceTimestamp
    ? new Date(referenceTimestamp)
    : new Date();
  const date = new Date(reference);
  date.setUTCFullYear(2000, 0, 1);

  const hours = Math.floor(timeOfDay * 24);
  const minutes = Math.floor((timeOfDay * 24 - hours) * 60);

  date.setUTCHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function buildCompositorBaseFromWeather(
  params: WeatherEffectParams & { timeOfDay?: number },
): WeatherCompositorParams {
  const effectConfig = mapWeatherToEffects(params);
  const timeOfDay =
    params.timeOfDay ??
    effectConfig.celestial?.timeOfDay ??
    getTimeOfDay(params.timestamp);

  const hasCloud = effectConfig.cloud !== undefined;
  const hasRain = effectConfig.rain !== undefined;
  const hasLightning = effectConfig.lightning !== undefined;
  const hasSnow = effectConfig.snow !== undefined;

  const lightningIntervalMin = effectConfig.lightning?.intervalMin ?? 4;
  const lightningIntervalMax = effectConfig.lightning?.intervalMax ?? 12;

  return {
    layers: {
      celestial: true,
      clouds: hasCloud,
      rain: hasRain,
      lightning: hasLightning,
      snow: hasSnow,
    },
    celestial: {
      timeOfDay,
      moonPhase: effectConfig.celestial?.moonPhase ?? 0.5,
      starDensity: effectConfig.celestial?.starDensity ?? 0.5,
      celestialX: effectConfig.celestial?.celestialX ?? 0.5,
      celestialY: effectConfig.celestial?.celestialY ?? 0.72,
      sunSize: effectConfig.celestial?.sunSize ?? 0.06,
      moonSize: effectConfig.celestial?.moonSize ?? 0.05,
      sunGlowIntensity: effectConfig.celestial?.sunGlowIntensity ?? 1.0,
      sunGlowSize: effectConfig.celestial?.sunGlowSize ?? 0.3,
      sunRayCount: effectConfig.celestial?.sunRayCount ?? 12,
      sunRayLength: effectConfig.celestial?.sunRayLength ?? 0.5,
      sunRayIntensity: effectConfig.celestial?.sunRayIntensity ?? 0.4,
      sunRayShimmer: 1.0,
      sunRayShimmerSpeed: 1.0,
      moonGlowIntensity: effectConfig.celestial?.moonGlowIntensity ?? 1.0,
      moonGlowSize: effectConfig.celestial?.moonGlowSize ?? 0.2,
      skyBrightness: 1.0,
      skySaturation: 1.0,
      skyContrast: 1.0,
    },
    cloud: {
      cloudScale: 1.5,
      coverage: effectConfig.cloud?.coverage ?? 0.5,
      density: 0.7,
      softness: 0.3,
      windSpeed: effectConfig.cloud?.speed ?? 0.5,
      windAngle: 0,
      turbulence: effectConfig.cloud?.turbulence ?? 0.5,
      lightIntensity: 1.0,
      ambientDarkness: effectConfig.cloud?.darkness ?? 0.3,
      backlightIntensity: 0.5,
      numLayers: 3,
    },
    rain: {
      glassIntensity: hasRain ? (effectConfig.rain?.intensity ?? 0.5) * 0.7 : 0,
      zoom: 1.0,
      fallingIntensity: hasRain ? (effectConfig.rain?.intensity ?? 0.6) : 0,
      fallingSpeed: 1.0,
      fallingAngle: hasRain ? (effectConfig.rain?.angle ?? 5) * 0.02 : 0.1,
      fallingStreakLength: 0.8,
      fallingLayers: 3,
      fallingRefraction: 0.3,
    },
    lightning: {
      autoMode: hasLightning
        ? (effectConfig.lightning?.autoTrigger ?? true)
        : false,
      autoInterval: hasLightning
        ? (lightningIntervalMin + lightningIntervalMax) / 2
        : 8,
      glowIntensity: 0.8,
      branchDensity: 0.6,
      sceneIllumination: 0.6,
    },
    snow: {
      intensity: hasSnow ? (effectConfig.snow?.intensity ?? 0.7) : 0,
      layers: 4,
      fallSpeed: 0.5,
      windSpeed: hasSnow ? (effectConfig.snow?.windDrift ?? 0.3) : 0.3,
      windAngle: 0,
      turbulence: 0.3,
      drift: hasSnow ? (effectConfig.snow?.windDrift ?? 0.3) : 0.3,
      flutter: 0.5,
      windShear: 0.2,
      flakeSize: 1.0,
      sizeVariation: 0.5,
      opacity: 0.8,
      glowAmount: 0.3,
      sparkle: 0.2,
    },
    post: {
      enabled: true,
      haze: 0,
      hazeHorizon: 0.5,
      hazeDesaturation: 0.3,
      hazeContrast: 0.2,
      bloomIntensity: 0,
      bloomThreshold: 0.8,
      bloomKnee: 0.5,
      bloomRadius: 8,
      bloomTapScale: 1,
      exposureIntensity: 0,
      exposureDesaturation: 0.3,
      exposureRecovery: 2,
      godRayIntensity: 0,
      godRayDecay: 0.96,
      godRayDensity: 0.5,
      godRayWeight: 0.3,
      godRaySamples: 60,
    },
  };
}

export function mapWeatherCompositorParamsToCanvasProps(
  params: WeatherStudioCompositorParams,
): WeatherEffectsCanvasProps {
  return {
    layers: params.layers,
    celestial: {
      timeOfDay: params.celestial.timeOfDay,
      moonPhase: params.celestial.moonPhase,
      starDensity: params.celestial.starDensity,
      celestialX: params.celestial.celestialX,
      celestialY: params.celestial.celestialY,
      sunSize: params.celestial.sunSize,
      moonSize: params.celestial.moonSize,
      sunGlowIntensity: params.celestial.sunGlowIntensity,
      sunGlowSize: params.celestial.sunGlowSize,
      sunRayCount: params.celestial.sunRayCount,
      sunRayLength: params.celestial.sunRayLength,
      sunRayIntensity: params.celestial.sunRayIntensity,
      sunRayShimmer: params.celestial.sunRayShimmer,
      sunRayShimmerSpeed: params.celestial.sunRayShimmerSpeed,
      moonGlowIntensity: params.celestial.moonGlowIntensity,
      moonGlowSize: params.celestial.moonGlowSize,
      skyBrightness: params.celestial.skyBrightness,
      skySaturation: params.celestial.skySaturation,
      skyContrast: params.celestial.skyContrast,
    },
    cloud: {
      coverage: params.cloud.coverage,
      density: params.cloud.density,
      softness: params.cloud.softness,
      cloudScale: params.cloud.cloudScale,
      windSpeed: params.cloud.windSpeed,
      windAngle: params.cloud.windAngle,
      turbulence: params.cloud.turbulence,
      lightIntensity: params.cloud.lightIntensity,
      ambientDarkness: params.cloud.ambientDarkness,
      backlightIntensity: params.cloud.backlightIntensity,
      numLayers: params.cloud.numLayers,
    },
    rain: {
      glassIntensity: params.rain.glassIntensity,
      glassZoom: params.rain.zoom,
      fallingIntensity: params.rain.fallingIntensity,
      fallingSpeed: params.rain.fallingSpeed,
      fallingAngle: params.rain.fallingAngle,
      fallingStreakLength: params.rain.fallingStreakLength,
      fallingLayers: params.rain.fallingLayers,
    },
    lightning: {
      enabled: params.layers.lightning,
      autoMode: params.lightning.autoMode,
      autoInterval: params.lightning.autoInterval,
      flashIntensity: params.lightning.glowIntensity,
      branchDensity: params.lightning.branchDensity,
    },
    snow: {
      intensity: params.snow.intensity,
      layers: params.snow.layers,
      fallSpeed: params.snow.fallSpeed,
      windSpeed: params.snow.windSpeed,
      windAngle: params.snow.windAngle,
      turbulence: params.snow.turbulence,
      drift: params.snow.drift,
      flutter: params.snow.flutter,
      windShear: params.snow.windShear,
      flakeSize: params.snow.flakeSize,
      sizeVariation: params.snow.sizeVariation,
      opacity: params.snow.opacity,
      glowAmount: params.snow.glowAmount,
      sparkle: params.snow.sparkle,
    },
    interactions: {
      rainRefractionStrength: params.rain.fallingRefraction,
      lightningSceneIllumination: params.lightning.sceneIllumination,
    },
    post: params.post,
  };
}

export function buildCanvasBaseFromWeather(
  params: WeatherEffectParams,
): WeatherEffectsCanvasProps {
  return mapWeatherCompositorParamsToCanvasProps(
    buildCompositorBaseFromWeather(params),
  );
}
