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

const tickHitSlop = { left: 12, right: 12 };

export const ConversationMap: FC<ConversationMapProps> = ({
  entries,
  activeId,
  visibleIds,
  onSelect,
  side = "right",
  className,
}) => {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const inView = new Set(visibleIds);
  const activeIndex = entries.findIndex((entry) => entry.id === activeId);
  const closePreview = (id: string) =>
    setPreviewId((current) => (current === id ? null : current));

  return (
    <View
      accessibilityLabel="Conversation map"
      className={cn(
        "aui-conversation-map w-6 flex-1 justify-center",
        className,
      )}
    >
      {entries.map((entry, index) => {
        const current = index === activeIndex;
        const onScreen = current || inView.has(entry.id);
        const previewed = entry.id === previewId;

        return (
          // The cap keeps a short thread packed instead of spread over the
          // whole rail; a long one outgrows it and the share decides.
          <View
            key={entry.id}
            className="aui-conversation-map-row max-h-3.5 min-h-0 flex-1 justify-center"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={entry.title}
              accessibilityHint={entry.preview}
              aria-selected={current}
              hitSlop={tickHitSlop}
              delayLongPress={200}
              onPress={() => onSelect?.(entry.id)}
              onLongPress={() => setPreviewId(entry.id)}
              onPressOut={() => closePreview(entry.id)}
              onHoverIn={() => setPreviewId(entry.id)}
              onHoverOut={() => closePreview(entry.id)}
              onFocus={() => setPreviewId(entry.id)}
              onBlur={() => closePreview(entry.id)}
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
