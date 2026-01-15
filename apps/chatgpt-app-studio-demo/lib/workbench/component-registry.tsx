"use client";

import type { ComponentType } from "react";
import { WelcomeCardSDK, POIMapSDK } from "./wrappers";

export type ComponentCategory = "cards" | "lists" | "forms" | "data";

type AnyComponent = ComponentType<any>;

export interface WorkbenchComponentEntry {
  id: string;
  label: string;
  description: string;
  category: ComponentCategory;
  component: AnyComponent;
  defaultProps: Record<string, unknown>;
  exportConfig: {
    entryPoint: string;
    exportName: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SDK Widget Registry
// ─────────────────────────────────────────────────────────────────────────────
// These components demonstrate the full OpenAI Apps SDK API surface.
// Each uses the SDK context (OpenAIProvider) to interact with the simulated
// window.openai API - display modes, widget state, tool calls, modals, etc.
// ─────────────────────────────────────────────────────────────────────────────

export const workbenchComponents: WorkbenchComponentEntry[] = [
  {
    id: "welcome",
    label: "Welcome",
    description: "A simple starter widget - the perfect starting point",
    category: "cards",
    component: WelcomeCardSDK,
    defaultProps: {
      title: "Welcome!",
      message:
        "This is your ChatGPT App. Edit this component to build something amazing.",
    },
    exportConfig: {
      entryPoint: "lib/workbench/wrappers/welcome-card-sdk.tsx",
      exportName: "WelcomeCardSDK",
    },
  },
  {
    id: "poi-map",
    label: "POI Map",
    description:
      "Interactive map with points of interest - demonstrates display mode transitions, widget state, and tool calls",
    category: "data",
    component: POIMapSDK,
    defaultProps: {
      id: "workbench-poi-map",
      title: "San Francisco Highlights",
      pois: [
        {
          id: "1",
          name: "Golden Gate Bridge",
          category: "landmark",
          lat: 37.8199,
          lng: -122.4783,
          description:
            "Iconic suspension bridge spanning the Golden Gate strait",
          rating: 4.8,
          imageUrl:
            "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400",
        },
        {
          id: "2",
          name: "Fisherman's Wharf",
          category: "entertainment",
          lat: 37.808,
          lng: -122.4177,
          description: "Historic waterfront with restaurants and attractions",
          rating: 4.3,
        },
        {
          id: "3",
          name: "Alcatraz Island",
          category: "museum",
          lat: 37.8267,
          lng: -122.4233,
          description: "Former federal prison, now a museum",
          rating: 4.7,
        },
        {
          id: "4",
          name: "Chinatown",
          category: "shopping",
          lat: 37.7941,
          lng: -122.4078,
          description: "Oldest Chinatown in North America",
          rating: 4.4,
        },
        {
          id: "5",
          name: "Golden Gate Park",
          category: "park",
          lat: 37.7694,
          lng: -122.4862,
          description: "Large urban park with gardens and museums",
          rating: 4.6,
        },
        {
          id: "6",
          name: "Pier 39",
          category: "entertainment",
          lat: 37.8087,
          lng: -122.4098,
          description: "Waterfront shopping and entertainment complex",
          rating: 4.2,
        },
      ],
      initialCenter: { lat: 37.7749, lng: -122.4194 },
      initialZoom: 12,
    },
    exportConfig: {
      entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
      exportName: "POIMapSDK",
    },
  },
];

export function getComponent(id: string): WorkbenchComponentEntry | undefined {
  return workbenchComponents.find((c) => c.id === id);
}

export function getComponentIds(): string[] {
  return workbenchComponents.map((c) => c.id);
}
