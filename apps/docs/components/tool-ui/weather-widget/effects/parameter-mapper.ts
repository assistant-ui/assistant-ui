import type { WeatherConditionCode } from "../schema";
import type {
  EffectLayerConfig,
  WeatherEffectParams,
  AtmosphereConfig,
  PostProcessConfig,
} from "./types";

/**
 * Calculate time of day from timestamp (0-1 scale).
 * 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm
 */
export function getTimeOfDay(timestamp?: string): number {
  if (!timestamp) {
    return 0.5; // Default to noon
  }

  const date = new Date(timestamp);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  return (hours + minutes / 60) / 24;
}

/**
 * Calculate approximate moon phase from date (0-1 scale).
 * 0 = new moon, 0.5 = full moon
 * Uses a simplified 29.5 day synodic month calculation.
 */
export function getMoonPhase(timestamp?: string): number {
  if (!timestamp) {
    return 0.5; // Default to full moon
  }

  const date = new Date(timestamp);
  // Normalize to midnight UTC so phase only changes day-to-day, not hour-to-hour
  date.setUTCHours(0, 0, 0, 0);
  // Known new moon reference: January 6, 2000
  const knownNewMoon = new Date("2000-01-06T00:00:00Z");
  const daysSinceNewMoon =
    (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const synodicMonth = 29.530588853;

  return (daysSinceNewMoon % synodicMonth) / synodicMonth;
}

/**
 * Calculate sun altitude from timestamp using a generic day cycle.
 * Returns -1 (midnight) to 1 (noon).
 */
export function getSunAltitude(timestamp?: string): number {
  if (!timestamp) {
    return 0.5; // Default to mid-morning
  }

  const date = new Date(timestamp);
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;

  // Generic sun cycle: rises at 6am, peaks at noon, sets at 6pm
  if (hours < 6) {
    // Before 6am: deep night to dawn (-1 to 0)
    return -1 + hours / 6;
  } else if (hours < 12) {
    // 6am to noon: rising (0 to 1)
    return (hours - 6) / 6;
  } else if (hours < 18) {
    // Noon to 6pm: falling (1 to 0)
    return 1 - (hours - 12) / 6;
  } else {
    // After 6pm: dusk to night (0 to -1)
    return -(hours - 18) / 6;
  }
}

/**
 * Determine if it's night based on sun altitude.
 */
export function isNightTime(sunAltitude: number): boolean {
  return sunAltitude < 0;
}

/**
 * Condition-based brightness modifiers.
 * 1.0 = no attenuation (clear), lower = darker scene.
 * Derived from CONDITION_PRESETS cloud.darkness values.
 */
const CONDITION_BRIGHTNESS: Record<WeatherConditionCode, number> = {
  clear: 1.0,
  "partly-cloudy": 0.9,
  cloudy: 0.8,
  overcast: 0.65,
  fog: 0.7,
  drizzle: 0.7,
  rain: 0.6,
  "heavy-rain": 0.45,
  thunderstorm: 0.3,
  snow: 0.8,
  sleet: 0.65,
  hail: 0.5,
  windy: 0.9,
};

/**
 * Calculate expected scene brightness from timestamp and condition.
 * Returns 0-1 where 0 = very dark (use dark theme), 1 = very bright (use light theme).
 *
 * This is a predictive calculation - it estimates brightness from weather data
 * rather than sampling the actual rendered canvas.
 */
export function getSceneBrightness(
  timestamp?: string,
  conditionCode: WeatherConditionCode = "clear",
): number {
  const sunAltitude = getSunAltitude(timestamp);

  // Solar contribution: convert -1..1 to 0..1, with a curve
  // Night (sunAltitude < 0) contributes very little light
  // Dawn/dusk (0-0.3) is dim, midday (0.7-1.0) is bright
  let solarBrightness: number;
  if (sunAltitude < 0) {
    // Night: 0.05 to 0.15 based on how deep into night
    solarBrightness = 0.05 + (1 + sunAltitude) * 0.1;
  } else {
    // Day: 0.15 to 1.0
    solarBrightness = 0.15 + sunAltitude * 0.85;
  }

  // Apply condition modifier
  const conditionModifier = CONDITION_BRIGHTNESS[conditionCode];

  // Combine: solar * condition, but condition can't make night bright
  const brightness = solarBrightness * conditionModifier;

  // Clamp to 0-1
  return Math.max(0, Math.min(1, brightness));
}

/**
 * Determine UI theme based on scene brightness.
 * Includes hysteresis to prevent rapid toggling at threshold.
 */
export type WeatherTheme = "light" | "dark";

export function getWeatherTheme(
  brightness: number,
  currentTheme?: WeatherTheme,
): WeatherTheme {
  // Hysteresis thresholds
  const DARK_THRESHOLD = 0.35;
  const LIGHT_THRESHOLD = 0.45;

  if (brightness < DARK_THRESHOLD) {
    return "dark";
  }
  if (brightness > LIGHT_THRESHOLD) {
    return "light";
  }

  // In the hysteresis zone (0.35-0.45): keep current theme
  return currentTheme ?? "dark";
}

/**
 * Convert timeOfDay (0-1) to sun altitude (-1 to 1).
 * 0 = midnight (-1), 0.25 = 6am (0), 0.5 = noon (1), 0.75 = 6pm (0)
 */
export function timeOfDayToSunAltitude(timeOfDay: number): number {
  // Map 0-1 to 0-24 hours
  const hours = timeOfDay * 24;

  if (hours < 6) {
    // Before 6am: deep night to dawn (-1 to 0)
    return -1 + hours / 6;
  } else if (hours < 12) {
    // 6am to noon: rising (0 to 1)
    return (hours - 6) / 6;
  } else if (hours < 18) {
    // Noon to 6pm: falling (1 to 0)
    return 1 - (hours - 12) / 6;
  } else {
    // After 6pm: dusk to night (0 to -1)
    return -(hours - 18) / 6;
  }
}

/**
 * Calculate scene brightness from timeOfDay (0-1) and condition.
 * Returns 0-1 where 0 = very dark (use dark theme), 1 = very bright (use light theme).
 */
export function getSceneBrightnessFromTimeOfDay(
  timeOfDay: number,
  conditionCode: WeatherConditionCode = "clear",
): number {
  const sunAltitude = timeOfDayToSunAltitude(timeOfDay);

  let solarBrightness: number;
  if (sunAltitude < 0) {
    solarBrightness = 0.05 + (1 + sunAltitude) * 0.1;
  } else {
    solarBrightness = 0.15 + sunAltitude * 0.85;
  }

  const conditionModifier = CONDITION_BRIGHTNESS[conditionCode];
  const brightness = solarBrightness * conditionModifier;

  return Math.max(0, Math.min(1, brightness));
}

/**
 * Map wind speed (mph) to effect intensity.
 * 0-10 mph: subtle, 10-25 mph: moderate, 25+ mph: dramatic
 */
function mapWindSpeed(mph: number = 0): number {
  if (mph <= 10) return (mph / 10) * 0.3;
  if (mph <= 25) return 0.3 + ((mph - 10) / 15) * 0.4;
  return 0.7 + Math.min((mph - 25) / 25, 0.3);
}

/**
 * Map precipitation level to intensity (0-1).
 */
function mapPrecipitation(
  level?: "none" | "light" | "moderate" | "heavy",
): number {
  switch (level) {
    case "light":
      return 0.3;
    case "moderate":
      return 0.6;
    case "heavy":
      return 1.0;
    default:
      return 0;
  }
}

/**
 * Map visibility (miles) to haze amount (0-1).
 * 10+ miles: clear (0), 5-10: light haze, <5: heavy haze
 */
function mapVisibility(miles: number = 10): number {
  if (miles >= 10) return 0;
  if (miles >= 5) return ((10 - miles) / 5) * 0.3;
  return 0.3 + ((5 - miles) / 5) * 0.7;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Celestial position, size, and atmospheric effect presets per condition.
 * Based on Arnheim compositional principles and atmospheric optics:
 *
 * Position (x, y):
 * - Upper-right quadrant (0.6-0.75 x) balances left-heavy UI chrome
 * - Higher y = open sky feeling; lower y = oppressive/dramatic
 * - Thunderstorm sits lowest (0.50), clear/windy highest (0.76-0.78)
 *
 * Size:
 * - Atmospheric scattering makes sun LARGER in fog/haze (0.28 in fog)
 * - Clear/windy = crisp, tight sun (0.09-0.10)
 *
 * Rays:
 * - Only visible in clear conditions (clear, partly-cloudy, windy, snow)
 * - Ray count 0 = disabled for rain/overcast/thunderstorm
 * - Wind clears air = maximum ray intensity (0.7)
 *
 * Glow:
 * - Fog = maximum spread (0.7), ethereal effect
 * - Clear/windy = tight, focused (0.22-0.25)
 * - Rain washes out glow (0.25-0.35 intensity)
 */
interface CelestialPreset {
  x: number;
  y: number;
  sunSize: number;
  moonSize: number;
  starDensity: number;
  sunGlowIntensity: number;
  sunGlowSize: number;
  sunRayCount: number;
  sunRayLength: number;
  sunRayIntensity: number;
  moonGlowIntensity: number;
  moonGlowSize: number;
}

// Unified celestial settings across all conditions
const UNIFIED_CELESTIAL: CelestialPreset = {
  x: 0.74,
  y: 0.78,
  sunSize: 0.14,
  moonSize: 0.17,
  starDensity: 2.0,
  sunGlowIntensity: 3.05,
  sunGlowSize: 0.3,
  sunRayCount: 6,
  sunRayLength: 3.0,
  sunRayIntensity: 0.1,
  moonGlowIntensity: 3.45,
  moonGlowSize: 0.94,
};

const CELESTIAL_PRESETS: Record<WeatherConditionCode, CelestialPreset> = {
  clear: UNIFIED_CELESTIAL,
  "partly-cloudy": UNIFIED_CELESTIAL,
  cloudy: UNIFIED_CELESTIAL,
  overcast: UNIFIED_CELESTIAL,
  fog: UNIFIED_CELESTIAL,
  drizzle: UNIFIED_CELESTIAL,
  rain: UNIFIED_CELESTIAL,
  "heavy-rain": UNIFIED_CELESTIAL,
  thunderstorm: UNIFIED_CELESTIAL,
  snow: UNIFIED_CELESTIAL,
  sleet: UNIFIED_CELESTIAL,
  hail: UNIFIED_CELESTIAL,
  windy: UNIFIED_CELESTIAL,
};

/**
 * Base condition presets. These define the default effect configuration
 * for each weather condition before parameter modifiers are applied.
 */
const CONDITION_PRESETS: Record<
  WeatherConditionCode,
  Omit<EffectLayerConfig, "atmosphere" | "celestial">
> = {
  clear: {
    cloud: { coverage: 0.1, speed: 0.3, darkness: 0, turbulence: 0.2 },
  },

  "partly-cloudy": {
    cloud: { coverage: 0.4, speed: 0.4, darkness: 0.1, turbulence: 0.3 },
  },

  cloudy: {
    cloud: { coverage: 0.7, speed: 0.4, darkness: 0.2, turbulence: 0.3 },
  },

  overcast: {
    cloud: { coverage: 0.95, speed: 0.3, darkness: 0.35, turbulence: 0.25 },
  },

  fog: {
    cloud: { coverage: 0.6, speed: 0.15, darkness: 0.15, turbulence: 0.1 },
  },

  drizzle: {
    cloud: { coverage: 0.75, speed: 0.35, darkness: 0.3, turbulence: 0.3 },
    rain: { intensity: 0.25, glassDrops: true, fallingRain: true, angle: 3 },
  },

  rain: {
    cloud: { coverage: 0.85, speed: 0.5, darkness: 0.4, turbulence: 0.4 },
    rain: { intensity: 0.6, glassDrops: true, fallingRain: true, angle: 5 },
  },

  "heavy-rain": {
    cloud: { coverage: 0.95, speed: 0.6, darkness: 0.55, turbulence: 0.5 },
    rain: { intensity: 1.0, glassDrops: true, fallingRain: true, angle: 8 },
  },

  thunderstorm: {
    cloud: { coverage: 1.0, speed: 0.7, darkness: 0.7, turbulence: 0.6 },
    rain: { intensity: 1.0, glassDrops: true, fallingRain: true, angle: 15 },
    lightning: {
      enabled: true,
      autoTrigger: true,
      intervalMin: 4,
      intervalMax: 12,
    },
  },

  snow: {
    cloud: { coverage: 0.7, speed: 0.25, darkness: 0.2, turbulence: 0.2 },
    snow: { intensity: 0.7, windDrift: 0.3 },
  },

  sleet: {
    cloud: { coverage: 0.8, speed: 0.4, darkness: 0.35, turbulence: 0.35 },
    rain: { intensity: 0.5, glassDrops: true, fallingRain: true, angle: 10 },
    snow: { intensity: 0.3, windDrift: 0.4 },
  },

  hail: {
    cloud: { coverage: 0.9, speed: 0.6, darkness: 0.5, turbulence: 0.5 },
    rain: { intensity: 0.7, glassDrops: true, fallingRain: true, angle: 5 },
    snow: { intensity: 0.3, windDrift: 0.4 },
  },

  windy: {
    cloud: { coverage: 0.5, speed: 1.0, darkness: 0.1, turbulence: 0.6 },
  },
};

/**
 * Maps weather parameters to effect layer configuration.
 * This is the core translation layer between schema and shaders.
 */
export function mapWeatherToEffects(
  params: WeatherEffectParams,
): EffectLayerConfig {
  const {
    conditionCode,
    windSpeed,
    precipitationLevel,
    visibility,
    timestamp,
    timeOfDay: explicitTimeOfDay,
  } = params;

  // Get base preset for this condition
  const preset = CONDITION_PRESETS[conditionCode];

  // Calculate derived values.
  // When explicit timeOfDay is provided, it is the canonical scene-time input.
  const resolvedTimeOfDay = explicitTimeOfDay ?? getTimeOfDay(timestamp);
  const sunAltitude = timeOfDayToSunAltitude(resolvedTimeOfDay);
  const windIntensity = mapWindSpeed(windSpeed);
  const precipIntensity = mapPrecipitation(precipitationLevel);
  const hazeAmount = mapVisibility(visibility);
  const isNight = isNightTime(sunAltitude);

  // Build atmosphere config
  const atmosphere: AtmosphereConfig = {
    sunAltitude,
    haze: Math.max(hazeAmount, (preset.cloud?.darkness ?? 0) * 0.3),
    starVisibility:
      isNight && !preset.cloud
        ? 1.0
        : isNight
          ? 1.0 - (preset.cloud?.coverage ?? 0)
          : 0,
  };

  // Build effect config, applying modifiers to preset values
  const config: EffectLayerConfig = { atmosphere };

  // Cloud layer with wind modifiers
  if (preset.cloud) {
    config.cloud = {
      ...preset.cloud,
      speed: preset.cloud.speed * (1 + windIntensity * 0.5),
      turbulence: preset.cloud.turbulence * (1 + windIntensity * 0.3),
    };
  }

  // Rain layer with precipitation and wind modifiers
  if (preset.rain) {
    const rainIntensity =
      precipIntensity > 0 ? precipIntensity : preset.rain.intensity;
    config.rain = {
      ...preset.rain,
      intensity: rainIntensity,
      angle: preset.rain.angle + windIntensity * 10,
    };
  }

  // Lightning layer (no modifiers, uses preset directly)
  if (preset.lightning) {
    config.lightning = { ...preset.lightning };
  }

  // Snow layer with wind modifiers
  if (preset.snow) {
    config.snow = {
      ...preset.snow,
      windDrift: preset.snow.windDrift + windIntensity * 0.3,
    };
  }

  // Celestial layer - always present, calculated from timestamp + condition presets
  const moonPhase = getMoonPhase(timestamp);
  const celestialPreset = CELESTIAL_PRESETS[conditionCode];
  config.celestial = {
    timeOfDay: resolvedTimeOfDay,
    moonPhase,
    starDensity: isNight ? celestialPreset.starDensity : 0,
    celestialX: celestialPreset.x,
    celestialY: celestialPreset.y,
    sunSize: celestialPreset.sunSize,
    moonSize: celestialPreset.moonSize,
    sunGlowIntensity: celestialPreset.sunGlowIntensity,
    sunGlowSize: celestialPreset.sunGlowSize,
    sunRayCount: celestialPreset.sunRayCount,
    sunRayLength: celestialPreset.sunRayLength,
    sunRayIntensity: celestialPreset.sunRayIntensity,
    moonGlowIntensity: celestialPreset.moonGlowIntensity,
    moonGlowSize: celestialPreset.moonGlowSize,
  };

  // ---------------------------------------------------------------------------
  // Post-processing (air + camera response)
  // ---------------------------------------------------------------------------
  const haze = clamp01(atmosphere.haze);
  const cloudCoverage = config.cloud?.coverage ?? 0;
  const hasClouds = cloudCoverage > 0.001;

  // Bloom should read as forward scatter: stronger in hazier air and for
  // dramatic conditions, but still subtle by default.
  const bloomConditionBoost =
    conditionCode === "fog"
      ? 0.18
      : conditionCode === "thunderstorm"
        ? 0.12
        : conditionCode === "heavy-rain"
          ? 0.1
          : conditionCode === "overcast"
            ? 0.08
            : conditionCode === "cloudy" || conditionCode === "partly-cloudy"
              ? 0.06
              : 0.04;

  const bloomIntensity = clamp01(0.04 + bloomConditionBoost + haze * 0.22);
  const bloomRadius = 1.1 + haze * 1.2;

  // Exposure response only matters when lightning can trigger.
  const exposureIntensity = config.lightning?.enabled ? 0.85 : 0.0;

  // Crepuscular rays need: sun above horizon, haze (particles), and cloud
  // structure (occlusion + gaps).
  const dayFactor = smoothstep(-0.05, 0.08, sunAltitude);
  const sunLowFactor = 1.0 - smoothstep(0.18, 0.7, Math.max(0, sunAltitude));
  const coverageFactor = smoothstep(0.25, 0.85, cloudCoverage);
  const notFullyOvercast = 1.0 - smoothstep(0.97, 1.0, cloudCoverage);
  const particleFactor = 0.35 + haze * 0.65;

  const godRayIntensity = hasClouds
    ? clamp01(
        dayFactor *
          sunLowFactor *
          coverageFactor *
          notFullyOvercast *
          particleFactor *
          0.6,
      )
    : 0.0;

  const post: PostProcessConfig = {
    enabled: true,
    haze,
    bloomIntensity,
    bloomRadius,
    exposureIntensity,
    godRayIntensity,
  };
  config.post = post;

  return config;
}

/**
 * Convert EffectLayerConfig to individual canvas prop objects.
 * This provides the final uniform values for each effect shader.
 */
export function configToCloudProps(config: EffectLayerConfig) {
  if (!config.cloud) return null;

  return {
    coverage: config.cloud.coverage,
    windSpeed: config.cloud.speed,
    turbulence: config.cloud.turbulence,
    sunAltitude: config.atmosphere.sunAltitude,
    ambientDarkness: config.cloud.darkness,
    starDensity: config.atmosphere.starVisibility * 0.5,
  };
}

export function configToRainProps(config: EffectLayerConfig) {
  if (!config.rain) return null;

  return {
    glassIntensity: config.rain.glassDrops ? config.rain.intensity * 0.7 : 0,
    fallingIntensity: config.rain.fallingRain ? config.rain.intensity : 0,
    fallingAngle: config.rain.angle * 0.02, // Convert degrees to radians-ish
  };
}

export function configToLightningProps(config: EffectLayerConfig) {
  if (!config.lightning) return null;

  return {
    autoMode: config.lightning.autoTrigger,
    autoInterval:
      (config.lightning.intervalMin + config.lightning.intervalMax) / 2,
  };
}

export function configToSnowProps(config: EffectLayerConfig) {
  if (!config.snow) return null;

  return {
    intensity: config.snow.intensity,
    windSpeed: config.snow.windDrift,
    drift: config.snow.windDrift,
  };
}

export function configToCelestialProps(config: EffectLayerConfig) {
  if (!config.celestial) return null;

  return {
    timeOfDay: config.celestial.timeOfDay,
    moonPhase: config.celestial.moonPhase,
    starDensity: config.celestial.starDensity,
    celestialX: config.celestial.celestialX,
    celestialY: config.celestial.celestialY,
    sunSize: config.celestial.sunSize,
    moonSize: config.celestial.moonSize,
    sunGlowIntensity: config.celestial.sunGlowIntensity,
    sunGlowSize: config.celestial.sunGlowSize,
    sunRayCount: config.celestial.sunRayCount,
    sunRayLength: config.celestial.sunRayLength,
    sunRayIntensity: config.celestial.sunRayIntensity,
    moonGlowIntensity: config.celestial.moonGlowIntensity,
    moonGlowSize: config.celestial.moonGlowSize,
  };
}

export function configToPostProps(config: EffectLayerConfig) {
  return config.post ?? null;
}
