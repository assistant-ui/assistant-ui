import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { ImageMessagePartComponent } from "@assistant-ui/react-native";
import {
  ImageIcon,
  ImageOffIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react-native";
import { memo, type PropsWithChildren, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image as NativeImage,
  Modal,
  Pressable,
  Text,
  View,
  type ImageLoadEvent,
  type ImageProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "./icon-button";
import { paper, usePulse } from "./surfaces";

export type ImageRootProps = ViewProps;

function ImageRoot({ className, children, ...props }: ImageRootProps) {
  return (
    <View
      className={cn(
        "aui-image-root",
        paper,
        "overflow-hidden rounded-xl",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}

type ImagePreviewProps = Omit<ImageProps, "source" | "style"> & {
  src: string;
  alt?: string;
  containerClassName?: string;
};

function ImagePreview({
  alt = "Image content",
  className,
  containerClassName,
  onError,
  onLoad,
  src,
  ...props
}: ImagePreviewProps) {
  const [aspectRatio, setAspectRatio] = useState<
    { src: string; value: number } | undefined
  >(undefined);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);
  const [errorSrc, setErrorSrc] = useState<string | undefined>(undefined);
  const loaded = loadedSrc === src;
  const error = errorSrc === src;
  const currentAspectRatio =
    aspectRatio?.src === src ? aspectRatio.value : undefined;
  const opacity = usePulse(!loaded && !error);

  const applyNaturalSize = (width: number, height: number) => {
    if (!(width > 0 && height > 0)) return;
    const value = width / height;
    setAspectRatio((current) =>
      current?.src === src && current.value === value
        ? current
        : { src, value },
    );
  };

  if (error) {
    return (
      <View
        className={cn(
          "aui-image-preview-error bg-muted min-h-32 items-center justify-center p-4",
          containerClassName,
        )}
      >
        <Icon as={ImageOffIcon} className="text-muted-foreground size-8" />
      </View>
    );
  }

  return (
    <View
      className={cn(
        "aui-image-preview relative min-h-32 w-full",
        containerClassName,
      )}
    >
      {!loaded && (
        <View className="bg-muted/50 absolute inset-0 items-center justify-center">
          <Animated.View style={{ opacity }}>
            <Icon as={ImageIcon} className="text-muted-foreground size-8" />
          </Animated.View>
        </View>
      )}
      <NativeImage
        source={{ uri: src }}
        accessibilityLabel={alt}
        resizeMode="contain"
        className={cn("w-full", !loaded && "opacity-0", className)}
        style={
          currentAspectRatio === undefined
            ? undefined
            : { aspectRatio: currentAspectRatio }
        }
        onLoad={(event) => {
          // react-native-web forwards the bare DOM load event, which carries no source and whose target is already null by the time the decoded image reports.
          const { source } = event.nativeEvent as Partial<
            ImageLoadEvent["nativeEvent"]
          >;
          if (source) {
            applyNaturalSize(source.width, source.height);
          } else {
            NativeImage.getSize(src, applyNaturalSize);
          }
          setLoadedSrc(src);
          onLoad?.(event);
        }}
        onError={(event) => {
          setErrorSrc(src);
          onError?.(event);
        }}
        {...props}
      />
    </View>
  );
}

function ImageFilename({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  if (!children) return null;

  return (
    <Text
      className={cn(
        "aui-image-filename text-muted-foreground px-2 py-1.5 text-xs",
        className,
      )}
      numberOfLines={1}
      {...props}
    >
      {children}
    </Text>
  );
}

type ImageZoomProps = PropsWithChildren<{
  src: string;
  alt?: string;
}>;

function ImageZoom({ src, alt = "Image preview", children }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <Pressable
        className="aui-image-zoom-trigger"
        accessibilityRole="imagebutton"
        accessibilityLabel="Zoom image"
        onPress={() => setIsOpen(true)}
      >
        {children}
      </Pressable>
      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable
          className="aui-image-zoom-overlay flex-1 items-center justify-center bg-black/80 p-4"
          accessibilityLabel="Zoomed image"
          onPress={close}
        >
          <NativeImage
            source={{ uri: src }}
            accessibilityLabel={alt}
            resizeMode="contain"
            className="aui-image-zoom-content h-full w-full"
          />
          <SafeAreaView edges={["top"]} className="absolute top-0 right-0 p-4">
            <IconButton label="Close zoomed image" onPress={close}>
              <Icon as={XIcon} className="text-background size-5" />
            </IconButton>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

function ImageGenerating({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        "aui-image-generating bg-muted/50 min-h-32 items-center justify-center p-4",
        className,
      )}
      accessibilityRole="progressbar"
      accessibilityLabel="Generating image"
    >
      <ActivityIndicator />
    </View>
  );
}

function ImageContentFilterError({
  className,
  reason,
}: {
  className?: string;
  reason?: string;
}) {
  return (
    <View
      className={cn(
        "aui-image-content-filter-error bg-muted/50 min-h-32 items-center justify-center gap-2 p-4",
        className,
      )}
    >
      <Icon as={ShieldAlertIcon} className="text-muted-foreground size-8" />
      <Text className="text-foreground text-sm font-medium">
        Image could not be generated
      </Text>
      {reason && (
        <Text className="text-muted-foreground text-center text-xs">
          {reason}
        </Text>
      )}
    </View>
  );
}

const ImageImpl: ImageMessagePartComponent = ({ image, filename, status }) => {
  if (status?.type === "running") {
    return (
      <ImageRoot>
        <ImageGenerating />
        <ImageFilename>{filename}</ImageFilename>
      </ImageRoot>
    );
  }

  if (status?.type === "incomplete" && status.reason === "content-filter") {
    return (
      <ImageRoot>
        <ImageContentFilterError reason="The provider blocked this image." />
      </ImageRoot>
    );
  }

  return (
    <ImageRoot>
      <ImageZoom src={image} alt={filename || "Image content"}>
        <ImagePreview src={image} alt={filename || "Image content"} />
      </ImageZoom>
      <ImageFilename>{filename}</ImageFilename>
    </ImageRoot>
  );
};

const Image = memo(ImageImpl) as unknown as ImageMessagePartComponent & {
  Root: typeof ImageRoot;
  Preview: typeof ImagePreview;
  Filename: typeof ImageFilename;
  Zoom: typeof ImageZoom;
  Generating: typeof ImageGenerating;
  ContentFilterError: typeof ImageContentFilterError;
};

Image.displayName = "Image";
Image.Root = ImageRoot;
Image.Preview = ImagePreview;
Image.Filename = ImageFilename;
Image.Zoom = ImageZoom;
Image.Generating = ImageGenerating;
Image.ContentFilterError = ImageContentFilterError;

export {
  Image,
  ImageRoot,
  ImagePreview,
  ImageFilename,
  ImageZoom,
  ImageGenerating,
  ImageContentFilterError,
};
