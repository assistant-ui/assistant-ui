import { useState, type ComponentProps } from "react";
import {
  Image as NativeImage,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ImageSize } from "../../ir";
import type { GenerativeUILibrary } from "../../types";
import { mediaDefinitions } from "../../vocabulary/definitions/media";
import { mapPlaces, placeHref } from "../../vocabulary/structureValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import { useListViewItemText } from "../rowLabel";
import { fade, RADIUS, useInk, useNativeTheme, useRowChild } from "../theme";

const SIZE = { sm: 128, md: 256, lg: 384 } as const;
const ROUND_SIZE = { sm: 32, md: 40, lg: 52 } as const;
const THUMBNAIL_SIZE = 72;

type ImageProps = {
  src?: string;
  alt?: string;
  size?: ImageSize;
  round?: boolean;
};

function ImageContent({
  src,
  alt,
  size,
  round,
  hidden,
}: ImageProps & { hidden: boolean }) {
  const [aspectRatio, setAspectRatio] = useState<number | undefined>();
  const rowChild = useRowChild();
  const width =
    typeof size === "number"
      ? size
      : round
        ? ROUND_SIZE[size ?? "md"]
        : size
          ? SIZE[size]
          : undefined;
  const thumbnail = !round && rowChild && size === "sm";
  const tile = !round && rowChild && !thumbnail && typeof size !== "number";
  return (
    <NativeImage
      source={{ uri: src }}
      accessible={!hidden}
      accessibilityRole={hidden ? undefined : "image"}
      accessibilityLabel={alt}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      aria-hidden={hidden}
      resizeMode={round || thumbnail || tile ? "cover" : "contain"}
      onLoad={(event) => {
        const { width: naturalWidth, height: naturalHeight } =
          event.nativeEvent.source;
        if (naturalWidth > 0 && naturalHeight > 0)
          setAspectRatio(naturalWidth / naturalHeight);
      }}
      style={{
        ...(round
          ? { width: width ?? 40, height: width ?? 40 }
          : thumbnail
            ? { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }
            : tile
              ? {
                  flex: 1,
                  minWidth: 0,
                  ...(width !== undefined ? { maxWidth: width } : {}),
                  aspectRatio: 4 / 3,
                }
              : {
                  width: "100%",
                  ...(width !== undefined ? { maxWidth: width } : {}),
                  aspectRatio: aspectRatio ?? 1,
                }),
        borderRadius: round ? RADIUS.pill : RADIUS.control,
      }}
    />
  );
}

function Image(props: ImageProps) {
  const consumed = useListViewItemText(props.alt);
  return (
    <ImageContent key={props.src} {...props} hidden={!props.alt || consumed} />
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, alignSelf: "stretch", marginVertical: 12 },
  diagram: { gap: 8 },
  diagramCode: { borderRadius: RADIUS.surface },
  diagramCodeContent: { padding: 12 },
  diagramSource: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 12,
    lineHeight: 18,
  },
  diagramCaption: { fontSize: 12, lineHeight: 18 },
  places: { gap: 12 },
  place: { gap: 3 },
  placeLabel: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  placeDetail: { fontSize: 12, lineHeight: 18 },
});

function Divider({ flush }: { flush?: boolean }) {
  const theme = useNativeTheme();
  return (
    <View
      style={[
        styles.divider,
        flush && { marginVertical: 0 },
        { backgroundColor: theme.hairline },
      ]}
    />
  );
}

function RowText({
  value,
  style,
}: {
  value: string;
  style: ComponentProps<typeof Text>["style"];
}) {
  const consumed = useListViewItemText(value);
  return (
    <Text aria-hidden={consumed} style={style}>
      {value}
    </Text>
  );
}

function Diagram({ code, title }: { code: unknown; title?: unknown }) {
  const theme = useNativeTheme();
  const ink = useInk();
  const caption = toTextContent(title);
  return (
    <View style={styles.diagram}>
      <ScrollView
        horizontal
        style={[styles.diagramCode, { backgroundColor: theme.secondary }]}
        contentContainerStyle={styles.diagramCodeContent}
      >
        <RowText
          value={String(toTextContent(code) ?? "")}
          style={[styles.diagramSource, { color: theme.foreground }]}
        />
      </ScrollView>
      {caption != null ? (
        <RowText
          value={String(caption)}
          style={[styles.diagramCaption, { color: fade(ink, 0.62) }]}
        />
      ) : null}
    </View>
  );
}

function MapPlaces({ places }: { places: unknown }) {
  const ink = useInk();
  return (
    <View accessibilityRole="list" style={styles.places}>
      {mapPlaces(places).map((place, index) => (
        <View key={index} style={styles.place}>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL(placeHref(place)).catch(() => {})
            }
          >
            <Text style={[styles.placeLabel, { color: ink }]}>
              {place.label}
            </Text>
          </Pressable>
          {place.detail !== undefined ? (
            <RowText
              value={place.detail}
              style={[styles.placeDetail, { color: fade(ink, 0.62) }]}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export const mediaVocabulary = {
  Image: {
    ...mediaDefinitions.Image,
    render: (props) => <Image {...props} />,
  },
  Divider: {
    ...mediaDefinitions.Divider,
    render: (props) => <Divider {...props} />,
  },
  Diagram: {
    ...mediaDefinitions.Diagram,
    render: (props) => <Diagram {...props} />,
  },
  Map: {
    ...mediaDefinitions.Map,
    render: (props) => <MapPlaces {...props} />,
  },
} satisfies GenerativeUILibrary;
