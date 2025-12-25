"use client";

import * as React from "react";
import { cn } from "../../utils/cn";
import { Card, ActionButtons } from "../shared";
import { normalizeActionsConfig } from "../../utils/actions-config";
import type { SerializableMediaCard } from "../../schemas/media-card";
import {
  MediaCardProvider,
  useMediaCard,
  type MediaCardClientProps,
  type MediaCardContextValue,
  type MediaCardUIState,
} from "./context";
import {
  MediaCardHeader,
  MediaCardBody,
  MediaCardFooter,
} from "./media-card-parts";
import { MediaFrame } from "./media-frame";

function MediaCardProgress({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex w-full animate-pulse flex-col gap-3", className)}
    >
      <div className="flex items-center gap-3 text-xs">
        <div className="bg-muted h-6 w-6 rounded-full" />
        <div className="bg-muted h-3 w-28 rounded" />
      </div>
      <div className="bg-muted h-40 w-full rounded-lg" />
      <div className="bg-muted h-4 w-3/4 rounded" />
      <div className="flex gap-2">
        <div className="bg-muted h-8 w-20 rounded-full" />
        <div className="bg-muted h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

function LinkOverlay({ label }: { label?: string | undefined }) {
  const { card, resolvedHref, handlers } = useMediaCard();

  if (!resolvedHref) {
    return null;
  }

  const ariaLabel =
    label ?? card.title ?? card.description ?? card.domain ?? resolvedHref;

  return (
    <a
      className="absolute inset-0 z-10"
      href={resolvedHref}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={ariaLabel}
      onClick={(event) => {
        if (handlers.onNavigate) {
          event.preventDefault();
          handlers.onNavigate(resolvedHref, card);
        }
      }}
    />
  );
}

const BASE_CARD_STYLE = "border border-border bg-card text-sm shadow-xs";
const DEFAULT_CONTENT_SPACING = "gap-4 p-5";
const LINK_CONTENT_SPACING = "px-5 py-4 gap-2";

export const DEFAULT_LOCALE = "en-US" as const;

export type MediaCardProps = SerializableMediaCard & MediaCardClientProps;

function sanitizeHref(href?: string) {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function MediaCard(props: MediaCardProps) {
  const {
    className,
    maxWidth,
    isLoading,
    state: controlledState,
    defaultState,
    onStateChange,
    onNavigate,
    onMediaEvent,
    footerActions,
    onFooterAction,
    onBeforeFooterAction,
    onMediaAction,
    onBeforeMediaAction,
    locale: providedLocale,
    ...serializable
  } = props;

  const { href: rawHref, source, ...rest } = serializable;
  const locale = providedLocale ?? DEFAULT_LOCALE;

  const sanitizedHref = sanitizeHref(rawHref);
  const sanitizedSourceUrl = sanitizeHref(source?.url);

  const cardPayload: SerializableMediaCard = {
    ...rest,
    href: sanitizedHref,
    source: source
      ? {
          ...source,
          url: sanitizedSourceUrl,
        }
      : undefined,
    locale,
  };

  if (process.env["NODE_ENV"] !== "production" && cardPayload.kind === "image") {
    if (!(cardPayload.alt && cardPayload.alt.trim())) {
      console.warn(
        `[MediaCard] Missing alt text for image card ${cardPayload.assetId}`,
      );
    }
  }

  const [uncontrolledState, setUncontrolledState] =
    React.useState<MediaCardUIState>(() => defaultState ?? {});
  const effectiveState = controlledState ?? uncontrolledState;

  const updateState = React.useCallback(
    (patch: Partial<MediaCardUIState>) => {
      if (controlledState) {
        const next = { ...controlledState, ...patch };
        onStateChange?.(next);
        return;
      }
      setUncontrolledState((prev) => {
        const next = { ...prev, ...patch };
        onStateChange?.(next);
        return next;
      });
    },
    [controlledState, onStateChange],
  );

  const [mediaElement, setMediaElement] =
    React.useState<HTMLMediaElement | null>(null);

  const resolvedHref = React.useMemo(() => {
    if (cardPayload.kind === "link") {
      return cardPayload.href ?? sanitizeHref(cardPayload.src);
    }
    return cardPayload.href;
  }, [cardPayload.href, cardPayload.kind, cardPayload.src]);

  const value: MediaCardContextValue = {
    card: cardPayload,
    locale,
    resolvedHref,
    resolvedSourceUrl: sanitizedSourceUrl,
    state: effectiveState,
    setState: updateState,
    handlers: {
      onNavigate,
      onMediaAction,
      onBeforeMediaAction,
      onMediaEvent,
    },
    mediaElement,
    setMediaElement,
  };

  const containerStyle: React.CSSProperties = maxWidth
    ? { maxWidth, width: "100%" }
    : { width: "100%" };

  const isImageCard = cardPayload.kind === "image";
  const isVideoCard = cardPayload.kind === "video";
  const isAudioCard = cardPayload.kind === "audio";
  const isLinkCard = cardPayload.kind === "link";
  const cardSpacingClass =
    isImageCard || isVideoCard || isLinkCard || isAudioCard
      ? "p-0"
      : DEFAULT_CONTENT_SPACING;
  const linkContentPadding = LINK_CONTENT_SPACING;

  const normalizedFooterActions = React.useMemo(
    () => normalizeActionsConfig(footerActions),
    [footerActions],
  );

  return (
    <article
      className="relative w-full"
      style={containerStyle}
      lang={locale}
      aria-busy={isLoading}
      data-media-card-kind={cardPayload.kind}
    >
      <MediaCardProvider value={value}>
        <Card
          className={cn(
            "group @container relative isolate flex w-full min-w-0 flex-col overflow-hidden shadow-xs",
            BASE_CARD_STYLE,
            cardSpacingClass,
            className,
          )}
        >
          {!isLoading && resolvedHref ? (
            <LinkOverlay
              label={cardPayload.title ?? cardPayload.domain ?? undefined}
            />
          ) : null}
          {isLoading ? (
            <div className="relative flex flex-col gap-4">
              <MediaCardProgress />
            </div>
          ) : isImageCard || isVideoCard ? (
            <MediaFrame />
          ) : isLinkCard ? (
            <div className="flex flex-col">
              <MediaFrame />
              <div className={cn("flex flex-col", linkContentPadding)}>
                <MediaCardHeader />
                <MediaCardBody />
                <MediaCardFooter />
              </div>
            </div>
          ) : isAudioCard ? (
            <div className="flex flex-col gap-3 p-3">
              <MediaFrame />
            </div>
          ) : (
            <div className="relative flex flex-col gap-4">
              <MediaCardHeader />
              <MediaFrame />
              <MediaCardBody />
              <MediaCardFooter />
            </div>
          )}
        </Card>
        {normalizedFooterActions ? (
          <div className="@container/actions mt-3">
            <ActionButtons
              actions={normalizedFooterActions.items}
              align={normalizedFooterActions.align}
              confirmTimeout={normalizedFooterActions.confirmTimeout}
              onAction={(id: string) => onFooterAction?.(id)}
              onBeforeAction={onBeforeFooterAction}
            />
          </div>
        ) : null}
      </MediaCardProvider>
    </article>
  );
}
