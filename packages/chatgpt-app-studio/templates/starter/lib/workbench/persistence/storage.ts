import type { LocalStoragePreferences } from "./types";
import type { ConsoleEntry } from "../types";
import type { MockConfigState } from "../mock-config";
import { STORAGE_KEYS, CONSOLE_MAX_ENTRIES } from "./constants";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readLocalStoragePreferences(): Partial<LocalStoragePreferences> {
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<LocalStoragePreferences>;
  } catch (error) {
    console.warn(
      "Failed to read workbench preferences from localStorage",
      error,
    );
    return {};
  }
}

export function writeLocalStoragePreferences(
  prefs: Partial<LocalStoragePreferences>,
): void {
  if (!isBrowser()) return;

  try {
    const existing = readLocalStoragePreferences();
    const merged = { ...existing, ...prefs };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(merged));
  } catch (error) {
    console.warn(
      "Failed to write workbench preferences to localStorage",
      error,
    );
  }
}

export function readSessionStorageConsole(): ConsoleEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.CONSOLE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsoleEntry[];
    return parsed.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  } catch (error) {
    console.warn("Failed to read console logs from sessionStorage", error);
    return [];
  }
}

export function writeSessionStorageConsole(logs: ConsoleEntry[]): void {
  if (!isBrowser()) return;

  try {
    const trimmed = logs.slice(-CONSOLE_MAX_ENTRIES);
    sessionStorage.setItem(STORAGE_KEYS.CONSOLE, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Failed to write console logs to sessionStorage", error);
  }
}

export function readLocalStorageMockConfig(): MockConfigState | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOCK_CONFIG);
    if (!raw) return null;
    return JSON.parse(raw) as MockConfigState;
  } catch (error) {
    console.warn("Failed to read mock config from localStorage", error);
    return null;
  }
}

export function writeLocalStorageMockConfig(config: MockConfigState): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEYS.MOCK_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.warn("Failed to write mock config to localStorage", error);
  }
}
