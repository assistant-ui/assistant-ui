import type {
  DisplayMode,
  Theme,
  DeviceType,
  SafeAreaInsets,
  ConsoleEntry,
} from "../types";

export interface UrlState {
  component: string;
  mode: DisplayMode;
  device: DeviceType;
  theme: Theme;
}

export interface LocalStoragePreferences {
  maxHeight: number;
  safeAreaInsets: SafeAreaInsets;
  locale: string;
  collapsedSections: Record<string, boolean>;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
}

export interface SessionStorageState {
  consoleLogs: ConsoleEntry[];
}
