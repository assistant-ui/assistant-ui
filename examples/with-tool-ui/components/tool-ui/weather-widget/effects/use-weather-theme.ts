import { useState, useEffect } from "react";
import type { WeatherCondition } from "../schema";
import {
  getSceneBrightness,
  getWeatherTheme,
  type WeatherTheme,
} from "./parameter-mapper";

interface UseWeatherThemeOptions {
  timestamp?: string;
  condition: WeatherCondition;
  enabled?: boolean;
}

interface UseWeatherThemeResult {
  theme: WeatherTheme;
  brightness: number;
}

/**
 * Hook to determine the appropriate UI theme based on weather conditions and time.
 *
 * Uses predictive brightness calculation from timestamp and condition,
 * with hysteresis to prevent rapid theme toggling near thresholds.
 */
export function useWeatherTheme({
  timestamp,
  condition,
  enabled = true,
}: UseWeatherThemeOptions): UseWeatherThemeResult {
  const [theme, setTheme] = useState<WeatherTheme>("light");

  const brightness = enabled ? getSceneBrightness(timestamp, condition) : 1;

  useEffect(() => {
    if (!enabled) {
      setTheme("light");
      return;
    }

    const newTheme = getWeatherTheme(brightness, theme);

    if (newTheme !== theme) {
      setTheme(newTheme);
    }
  }, [brightness, enabled, theme]);

  return { theme, brightness };
}
