"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWorkbenchStore } from "../store";
import {
  readLocalStoragePreferences,
  writeLocalStoragePreferences,
  readSessionStorageConsole,
  writeSessionStorageConsole,
  readLocalStorageMockConfig,
  writeLocalStorageMockConfig,
} from "./storage";
import { parseUrlParams, buildUrlParams } from "./url";
import type { UrlState } from "./types";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function useWorkbenchPersistence() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);
  const isUpdatingFromUrl = useRef(false);

  const store = useWorkbenchStore();

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const prefs = readLocalStoragePreferences();
    if (prefs.maxHeight !== undefined) store.setMaxHeight(prefs.maxHeight);
    if (prefs.safeAreaInsets) store.setSafeAreaInsets(prefs.safeAreaInsets);
    if (prefs.locale) store.setLocale(prefs.locale);
    if (prefs.isLeftPanelOpen !== undefined)
      store.setLeftPanelOpen(prefs.isLeftPanelOpen);
    if (!isDemoMode && prefs.isRightPanelOpen !== undefined)
      store.setRightPanelOpen(prefs.isRightPanelOpen);

    const consoleLogs = readSessionStorageConsole();
    if (consoleLogs.length > 0) {
      store.restoreConsoleLogs(consoleLogs);
    }

    const mockConfig = readLocalStorageMockConfig();
    if (mockConfig) {
      store.setMockConfig(mockConfig);
    }

    isUpdatingFromUrl.current = true;
    const urlState = parseUrlParams(searchParams);
    if (urlState.component) store.setSelectedComponent(urlState.component);
    if (urlState.mode) store.setDisplayMode(urlState.mode);
    if (urlState.device) store.setDeviceType(urlState.device);
    if (urlState.theme) store.setTheme(urlState.theme);
    isUpdatingFromUrl.current = false;
  }, []);

  useEffect(() => {
    if (!isInitialized.current || isUpdatingFromUrl.current) return;

    const currentUrlState: UrlState = {
      component: store.selectedComponent,
      mode: store.displayMode,
      device: store.deviceType,
      theme: store.theme,
    };

    const newParams = buildUrlParams(currentUrlState);
    const currentSearch = searchParams.toString();
    const newSearch = newParams.toString();

    if (currentSearch !== newSearch) {
      router.replace(`?${newSearch}`, { scroll: false });
    }
  }, [
    store.selectedComponent,
    store.displayMode,
    store.deviceType,
    store.theme,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!isInitialized.current) return;

    writeLocalStoragePreferences({
      maxHeight: store.maxHeight,
      safeAreaInsets: store.safeAreaInsets,
      locale: store.locale,
      collapsedSections: store.collapsedSections,
      isLeftPanelOpen: store.isLeftPanelOpen,
      isRightPanelOpen: store.isRightPanelOpen,
    });
  }, [
    store.maxHeight,
    store.safeAreaInsets,
    store.locale,
    store.collapsedSections,
    store.isLeftPanelOpen,
    store.isRightPanelOpen,
  ]);

  useEffect(() => {
    if (!isInitialized.current) return;
    writeSessionStorageConsole(store.consoleLogs);
  }, [store.consoleLogs]);

  useEffect(() => {
    if (!isInitialized.current) return;
    writeLocalStorageMockConfig(store.mockConfig);
  }, [store.mockConfig]);
}
