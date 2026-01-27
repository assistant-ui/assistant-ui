"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { detectPlatform } from "./detect";
import { ChatGPTBridge } from "../platforms/chatgpt/bridge";
import { MCPBridge, type AppCapabilities } from "../platforms/mcp/bridge";
import type { ExtendedBridge } from "../core/bridge";
import type { Platform } from "../core/types";

const UniversalContext = createContext<ExtendedBridge | null>(null);
const PlatformContext = createContext<Platform>("unknown");

export interface UniversalProviderProps {
  children: ReactNode;
  appInfo?: { name: string; version: string };
  appCapabilities?: AppCapabilities;
}

export function UniversalProvider({
  children,
  appInfo,
  appCapabilities,
}: UniversalProviderProps) {
  const [bridge, setBridge] = useState<ExtendedBridge | null>(null);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);

    let newBridge: ExtendedBridge;
    if (detected === "chatgpt") {
      newBridge = new ChatGPTBridge();
    } else if (detected === "mcp") {
      newBridge = new MCPBridge(appInfo, appCapabilities);
    } else {
      setReady(true);
      return;
    }

    newBridge
      .connect()
      .then(() => {
        setBridge(newBridge);
        setReady(true);
      })
      .catch((error) => {
        console.error("[mcp-app-studio] Bridge connection failed:", error);
        // Allow render with null bridge so the app can show a fallback UI
        setReady(true);
      });
  }, [appInfo, appCapabilities]);

  if (!ready) return null;

  return (
    <PlatformContext.Provider value={platform}>
      <UniversalContext.Provider value={bridge}>
        {children}
      </UniversalContext.Provider>
    </PlatformContext.Provider>
  );
}

export function useUniversalBridge(): ExtendedBridge | null {
  return useContext(UniversalContext);
}

export function usePlatform(): Platform {
  return useContext(PlatformContext);
}
