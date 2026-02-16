import {
  DEFAULT_CELESTIAL,
  DEFAULT_CLOUD,
  DEFAULT_INTERACTIONS,
  DEFAULT_LAYERS,
  DEFAULT_LIGHTNING,
  DEFAULT_POST,
  DEFAULT_RAIN,
  DEFAULT_SNOW,
} from "./weather-effects-defaults";
import type {
  ResolvedWeatherEffectsCanvasProps,
  WeatherEffectsCanvasProps,
} from "./weather-effects-types";

export function resolveWeatherEffectsCanvasRuntimeProps(
  props: WeatherEffectsCanvasProps,
): ResolvedWeatherEffectsCanvasProps {
  const mergedProps = {
    layers: { ...DEFAULT_LAYERS, ...props.layers },
    celestial: { ...DEFAULT_CELESTIAL, ...props.celestial },
    cloud: { ...DEFAULT_CLOUD, ...props.cloud },
    rain: { ...DEFAULT_RAIN, ...props.rain },
    lightning: { ...DEFAULT_LIGHTNING, ...props.lightning },
    snow: { ...DEFAULT_SNOW, ...props.snow },
    interactions: { ...DEFAULT_INTERACTIONS, ...props.interactions },
    post: { ...DEFAULT_POST, ...props.post },
  };

  return {
    ...mergedProps,
    ...(props.dpr !== undefined ? { dpr: props.dpr } : {}),
  };
}
