import type { DisplayMode, Theme, DeviceType } from "../types";
import type { UrlState } from "./types";
import { URL_PARAMS } from "./constants";
import { getComponentIds } from "../component-registry";

const VALID_MODES: DisplayMode[] = ["inline", "pip", "fullscreen"];
const VALID_THEMES: Theme[] = ["light", "dark"];
const VALID_DEVICES: DeviceType[] = ["mobile", "tablet", "desktop"];

export function parseUrlParams(
  searchParams: URLSearchParams,
): Partial<UrlState> {
  const result: Partial<UrlState> = {};

  const componentParam = searchParams.get(URL_PARAMS.COMPONENT);
  if (componentParam && getComponentIds().includes(componentParam)) {
    result.component = componentParam;
  }

  const modeParam = searchParams.get(URL_PARAMS.MODE) as DisplayMode | null;
  if (modeParam && VALID_MODES.includes(modeParam)) {
    result.mode = modeParam;
  }

  const deviceParam = searchParams.get(URL_PARAMS.DEVICE) as DeviceType | null;
  if (deviceParam && VALID_DEVICES.includes(deviceParam)) {
    result.device = deviceParam;
  }

  const themeParam = searchParams.get(URL_PARAMS.THEME) as Theme | null;
  if (themeParam && VALID_THEMES.includes(themeParam)) {
    result.theme = themeParam;
  }

  return result;
}

export function buildUrlParams(state: UrlState): URLSearchParams {
  const params = new URLSearchParams();
  params.set(URL_PARAMS.COMPONENT, state.component);
  params.set(URL_PARAMS.MODE, state.mode);
  params.set(URL_PARAMS.DEVICE, state.device);
  params.set(URL_PARAMS.THEME, state.theme);
  return params;
}
