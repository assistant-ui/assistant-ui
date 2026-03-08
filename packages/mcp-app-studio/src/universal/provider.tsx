"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { MCPBridge, type AppCapabilities } from "../platforms/mcp/bridge";
import { withChatGPTExtensions } from "../extensions/chatgpt";
import type { ExtendedBridge } from "../core/bridge";
import type { Platform } from "../core/types";
import { detectPlatform } from "./detect";

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
    let cancelled = false;

    const detectedPlatform = detectPlatform();
    if (detectedPlatform !== "mcp") {
      setBridge(null);
      setPlatform("unknown");
      setReady(true);
      return;
    }

    const newBridge = withChatGPTExtensions(
      new MCPBridge(appInfo, appCapabilities),
    );

    newBridge
      .connect()
      .then(() => {
        if (cancelled) return;
        setBridge(newBridge);
        setPlatform("mcp");
        setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[mcp-app-studio] Bridge connection failed:", error);
        setPlatform("unknown");
        setReady(true);
      });

    return () => {
      cancelled = true;
      if (newBridge && "disconnect" in newBridge) {
        (newBridge as { disconnect: () => void }).disconnect();
      }
    };
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
