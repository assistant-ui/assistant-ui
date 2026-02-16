export type WeatherWidgetTheme = "light" | "dark";

export const getWeatherWidgetMountClass = (isMounted: boolean): string =>
  isMounted ? "opacity-100" : "opacity-0";

export const getWeatherWidgetBackgroundClass = (
  theme: WeatherWidgetTheme,
): string =>
  theme === "dark"
    ? "bg-zinc-950 bg-gradient-to-b from-zinc-950 via-zinc-900/70 to-zinc-950"
    : "bg-sky-100 bg-gradient-to-b from-sky-50 via-sky-100/70 to-white";
