import { useState } from "react";
import { Image as NativeImage, StyleSheet, View } from "react-native";
import type { ImageSize } from "../../ir";
import type { GenerativeUILibrary } from "../../types";
import { mediaDefinitions } from "../../vocabulary/definitions/media";
import { useListViewItemText } from "../rowLabel";
import { RADIUS, useNativeTheme } from "../theme";

const SIZE = { sm: 128, md: 256, lg: 384 } as const;
const ROUND_SIZE = { sm: 32, md: 40, lg: 52 } as const;

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
  const width =
    typeof size === "number"
      ? size
      : round
        ? ROUND_SIZE[size ?? "md"]
        : size
          ? SIZE[size]
          : undefined;
  return (
    <NativeImage
      source={{ uri: src }}
      accessible={!hidden}
      accessibilityRole={hidden ? undefined : "image"}
      accessibilityLabel={alt}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      aria-hidden={hidden}
      resizeMode={round ? "cover" : "contain"}
      onLoad={(event) => {
        const { width: naturalWidth, height: naturalHeight } =
          event.nativeEvent.source;
        if (naturalWidth > 0 && naturalHeight > 0)
          setAspectRatio(naturalWidth / naturalHeight);
      }}
      style={{
        width: round ? (width ?? 40) : "100%",
        ...(round
          ? { height: width ?? 40 }
          : {
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

export const mediaVocabulary = {
  Image: {
    ...mediaDefinitions.Image,
    render: (props) => <Image {...props} />,
  },
  Divider: {
    ...mediaDefinitions.Divider,
    render: (props) => <Divider {...props} />,
  },
} satisfies GenerativeUILibrary;
