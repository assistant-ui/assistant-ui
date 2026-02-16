import type {
  LayerToggles,
  WeatherEffectsCanvasProps,
} from "./weather-effects-types";
import type {
  CustomEffectProps,
  WeatherEffectLayer,
} from "./custom-effect-props";

function sunAltitudeToLightIntensity(sunAltitude: number): number {
  const light =
    sunAltitude < 0
      ? 0.05 + (1 + sunAltitude) * 0.1
      : 0.15 + sunAltitude * 0.85;
  return Math.max(0, Math.min(1, light));
}

function isLayerEnabled(
  enabledLayers: CustomEffectProps["enabledLayers"],
  layer: WeatherEffectLayer,
  hasConfig: boolean,
): boolean {
  if (!hasConfig) return false;
  if (!enabledLayers) return true;
  return enabledLayers.includes(layer);
}

export function mapCustomEffectPropsToCanvasProps(
  custom: CustomEffectProps,
): WeatherEffectsCanvasProps | null {
  const hasCelestial = isLayerEnabled(
    custom.enabledLayers,
    "celestial",
    custom.celestial !== undefined,
  );
  const hasCloud = isLayerEnabled(
    custom.enabledLayers,
    "clouds",
    custom.cloud !== undefined,
  );
  const hasRain = isLayerEnabled(
    custom.enabledLayers,
    "rain",
    custom.rain !== undefined,
  );
  const hasLightning = isLayerEnabled(
    custom.enabledLayers,
    "lightning",
    custom.lightning !== undefined,
  );
  const hasSnow = isLayerEnabled(
    custom.enabledLayers,
    "snow",
    custom.snow !== undefined,
  );
  const hasPost = custom.post !== undefined;

  if (
    !hasCelestial &&
    !hasCloud &&
    !hasRain &&
    !hasLightning &&
    !hasSnow &&
    !hasPost
  ) {
    return null;
  }

  const layers: Partial<LayerToggles> = {
    celestial: hasCelestial,
    clouds: hasCloud,
    rain: hasRain,
    lightning: hasLightning,
    snow: hasSnow,
  };

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

  const canvasProps: WeatherEffectsCanvasProps = { layers };

  if (hasCelestial && custom.celestial) {
    canvasProps.celestial = custom.celestial;
  }

  if (hasCloud && custom.cloud) {
    canvasProps.cloud = {
      coverage: custom.cloud.coverage,
      windSpeed: custom.cloud.windSpeed,
      turbulence: custom.cloud.turbulence,
      lightIntensity:
        custom.cloud.lightIntensity ??
        sunAltitudeToLightIntensity(custom.cloud.sunAltitude),
      ambientDarkness: custom.cloud.ambientDarkness,
      ...(custom.cloud.density !== undefined
        ? { density: custom.cloud.density }
        : {}),
      ...(custom.cloud.softness !== undefined
        ? { softness: custom.cloud.softness }
        : {}),
      ...(custom.cloud.cloudScale !== undefined
        ? { cloudScale: custom.cloud.cloudScale }
        : {}),
      ...(custom.cloud.windAngle !== undefined
        ? { windAngle: custom.cloud.windAngle }
        : {}),
      ...(custom.cloud.numLayers !== undefined
        ? { numLayers: custom.cloud.numLayers }
        : {}),
    };
  }

  if (hasRain && custom.rain) {
    canvasProps.rain = {
      glassIntensity: custom.rain.glassIntensity,
      fallingIntensity: custom.rain.fallingIntensity,
      fallingAngle: custom.rain.fallingAngle,
      ...(custom.rain.zoom !== undefined
        ? { glassZoom: custom.rain.zoom }
        : {}),
      ...(custom.rain.fallingSpeed !== undefined
        ? { fallingSpeed: custom.rain.fallingSpeed }
        : {}),
      ...(custom.rain.fallingStreakLength !== undefined
        ? { fallingStreakLength: custom.rain.fallingStreakLength }
        : {}),
      ...(custom.rain.fallingLayers !== undefined
        ? { fallingLayers: custom.rain.fallingLayers }
        : {}),
    };
  }

  if (hasLightning && custom.lightning) {
    canvasProps.lightning = {
      enabled: true,
      autoMode: custom.lightning.autoMode,
      autoInterval: custom.lightning.autoInterval,
      ...(custom.lightning.glowIntensity !== undefined
        ? { flashIntensity: custom.lightning.glowIntensity }
        : {}),
      ...(custom.lightning.branchDensity !== undefined
        ? { branchDensity: custom.lightning.branchDensity }
        : {}),
    };
  }

  if (hasSnow && custom.snow) {
    canvasProps.snow = {
      intensity: custom.snow.intensity,
      windSpeed: custom.snow.windSpeed,
      drift: custom.snow.drift,
      ...(custom.snow.layers !== undefined
        ? { layers: custom.snow.layers }
        : {}),
      ...(custom.snow.fallSpeed !== undefined
        ? { fallSpeed: custom.snow.fallSpeed }
        : {}),
      ...(custom.snow.flakeSize !== undefined
        ? { flakeSize: custom.snow.flakeSize }
        : {}),
    };
  }

  if (Object.keys(interactions).length > 0) {
    canvasProps.interactions = interactions;
  }

  if (custom.post) {
    canvasProps.post = custom.post;
  }

  return canvasProps;
}
