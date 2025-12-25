"use client";

import * as React from "react";
import type { SerializableMediaCard } from "../../schemas/media-card";
import type { ActionsConfig } from "../../schemas/shared";

export type MediaCardUIState = {
  playing?: boolean | undefined;
  muted?: boolean | undefined;
  selected?: boolean | undefined;
};

export interface MediaCardClientProps {
  className?: string | undefined;
  maxWidth?: string | undefined;
  isLoading?: boolean | undefined;
  state?: MediaCardUIState | undefined;
  defaultState?: MediaCardUIState | undefined;
  onStateChange?: ((state: MediaCardUIState) => void) | undefined;
  onNavigate?:
    | ((href: string, card: SerializableMediaCard) => void)
    | undefined;
  onAction?:
    | ((actionId: string, card: SerializableMediaCard) => void)
    | undefined;
  onBeforeAction?:
    | ((args: {
        action: string;
        card: SerializableMediaCard;
      }) => boolean | Promise<boolean>)
    | undefined;
  onMediaEvent?:
    | ((type: "play" | "pause" | "mute" | "unmute", payload?: unknown) => void)
    | undefined;
  onMediaAction?:
    | ((actionId: string, card: SerializableMediaCard) => void)
    | undefined;
  onBeforeMediaAction?:
    | ((args: {
        action: string;
        card: SerializableMediaCard;
      }) => boolean | Promise<boolean>)
    | undefined;
  footerActions?: ActionsConfig | undefined;
  onFooterAction?: ((actionId: string) => void | Promise<void>) | undefined;
  onBeforeFooterAction?:
    | ((actionId: string) => boolean | Promise<boolean>)
    | undefined;
  locale?: string | undefined;
}

export interface MediaCardContextValue {
  card: SerializableMediaCard;
  locale: string;
  resolvedHref?: string | undefined;
  resolvedSourceUrl?: string | undefined;
  state: MediaCardUIState;
  setState: (patch: Partial<MediaCardUIState>) => void;
  handlers: Pick<
    MediaCardClientProps,
    "onNavigate" | "onMediaAction" | "onBeforeMediaAction" | "onMediaEvent"
  >;
  mediaElement: HTMLMediaElement | null;
  setMediaElement: (node: HTMLMediaElement | null) => void;
}

const MediaCardContext = React.createContext<MediaCardContextValue | null>(
  null,
);

export function useMediaCard() {
  const ctx = React.useContext(MediaCardContext);
  if (!ctx) {
    throw new Error(
      "useMediaCard must be used within a <MediaCardProvider />",
    );
  }
  return ctx;
}

export function MediaCardProvider({
  value,
  children,
}: {
  value: MediaCardContextValue;
  children: React.ReactNode;
}) {
  return (
    <MediaCardContext.Provider value={value}>
      {children}
    </MediaCardContext.Provider>
  );
}
