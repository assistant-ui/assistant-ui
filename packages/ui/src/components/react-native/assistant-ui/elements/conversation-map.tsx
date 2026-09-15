import { cn } from "@/lib/utils";
import { type FC, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { paper } from "./surfaces";

export interface ConversationMapEntry {
  id: string;
  title: string;
  preview?: string;
}

export interface ConversationMapProps {
  entries: readonly ConversationMapEntry[];
  activeId?: string | undefined;
  visibleIds?: readonly string[] | undefined;
  onSelect?: ((id: string) => void) | undefined;
  /** Which side of the rail the preview card opens on. */
  side?: "left" | "right";
  className?: string;
}

const tickHitSlop = { left: 4, right: 4 };

/** A preview stays open while any of the interactions that opened it is still active. */
type PreviewSources = {
  hover: string | null;
  focus: string | null;
  hold: string | null;
};

const NO_PREVIEW: PreviewSources = { hover: null, focus: null, hold: null };

export const ConversationMap: FC<ConversationMapProps> = ({
  entries,
  activeId,
  visibleIds,
  onSelect,
  side = "right",
  className,
}) => {
  const [preview, setPreview] = useState<PreviewSources>(NO_PREVIEW);
  const inView = new Set(visibleIds);
  const activeIndex = entries.findIndex((entry) => entry.id === activeId);
  const previewId = preview.hold ?? preview.focus ?? preview.hover;
  const openPreview = (source: keyof PreviewSources, id: string) =>
    setPreview((current) => ({ ...current, [source]: id }));
  const closePreview = (source: keyof PreviewSources, id: string) =>
    setPreview((current) =>
      current[source] === id ? { ...current, [source]: null } : current,
    );

  return (
    <View
      accessibilityLabel="Conversation map"
      className={cn(
        "aui-conversation-map w-8 flex-1 justify-center",
        className,
      )}
    >
      {entries.map((entry, index) => {
        const current = index === activeIndex;
        const onScreen = current || inView.has(entry.id);
        const previewed = entry.id === previewId;

        return (
          // The cap keeps a short thread packed instead of spread over the
          // whole rail; a long one outgrows it and the share decides. Touch
          // keeps a finger-sized row where the web cap fits a pointer.
          <View
            key={entry.id}
            className="aui-conversation-map-row web:max-h-3.5 max-h-12 min-h-0 flex-1 justify-center"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={entry.title}
              accessibilityHint={entry.preview}
              aria-selected={current}
              hitSlop={tickHitSlop}
              delayLongPress={200}
              onPress={() => onSelect?.(entry.id)}
              onLongPress={() => openPreview("hold", entry.id)}
              onPressOut={() => closePreview("hold", entry.id)}
              onHoverIn={() => openPreview("hover", entry.id)}
              onHoverOut={() => closePreview("hover", entry.id)}
              onFocus={() => openPreview("focus", entry.id)}
              onBlur={() => closePreview("focus", entry.id)}
              className="aui-conversation-map-tick flex-1 justify-center"
            >
              {({ pressed }) => (
                <View
                  className={cn(
                    "rounded-full",
                    pressed || previewed ? "w-6" : "w-3",
                    current
                      ? "bg-foreground/90 h-[3px]"
                      : onScreen
                        ? "bg-foreground/50 h-0.5"
                        : "bg-foreground/15 h-0.5",
                  )}
                />
              )}
            </Pressable>
            {previewed && (
              <View
                pointerEvents="none"
                className={cn(
                  paper,
                  "aui-conversation-map-preview absolute w-60 rounded-2xl p-3.5",
                  side === "right" ? "left-full ms-2.5" : "right-full me-2.5",
                  index * 2 < entries.length ? "top-0" : "bottom-0",
                )}
              >
                <Text
                  numberOfLines={2}
                  className="text-foreground text-[13px] leading-snug font-medium"
                >
                  {entry.title}
                </Text>
                {entry.preview && (
                  <Text
                    numberOfLines={3}
                    className="text-foreground/50 mt-1 text-[13px] leading-relaxed"
                  >
                    {entry.preview}
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};
