"use client";

import {
  memo,
  useState,
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  ImageOffIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import type {
  ImageMessagePart,
  ImageMessagePartComponent,
} from "@assistant-ui/react";
import {
  useImagePartCopy,
  useImagePartDownload,
  useImagePartRegenerate,
  type ImageGenerationAdapter,
  type ImageGenerationResult,
  type UseImagePartRegenerateOptions,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const imageVariants = cva(
  "aui-image-root relative overflow-hidden rounded-lg",
  {
    variants: {
      variant: {
        outline: "border border-border",
        ghost: "",
        muted: "bg-muted/50",
      },
      size: {
        sm: "max-w-64",
        default: "max-w-96",
        lg: "max-w-[512px]",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

export type ImageRootProps = React.ComponentProps<"div"> &
  VariantProps<typeof imageVariants>;

function ImageRoot({
  className,
  variant,
  size,
  children,
  ...props
}: ImageRootProps) {
  return (
    <div
      data-slot="image-root"
      data-variant={variant}
      data-size={size}
      className={cn(imageVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </div>
  );
}

type ImagePreviewProps = Omit<React.ComponentProps<"img">, "children"> & {
  containerClassName?: string;
};

function ImagePreview({
  className,
  containerClassName,
  onLoad,
  onError,
  alt = "Image content",
  src,
  ...props
}: ImagePreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>(undefined);
  const [errorSrc, setErrorSrc] = useState<string | undefined>(undefined);

  const loaded = loadedSrc === src;
  const error = errorSrc === src;

  useEffect(() => {
    if (
      typeof src === "string" &&
      imgRef.current?.complete &&
      imgRef.current.naturalWidth > 0
    ) {
      setLoadedSrc(src);
    }
  }, [src]);

  return (
    <div
      data-slot="image-preview"
      className={cn("relative min-h-32", containerClassName)}
    >
      {!loaded && !error && (
        <div
          data-slot="image-preview-loading"
          className="absolute inset-0 flex items-center justify-center bg-muted/50"
        >
          <ImageIcon className="size-8 animate-pulse text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div
          data-slot="image-preview-error"
          className="flex min-h-32 items-center justify-center bg-muted/50 p-4"
        >
          <ImageOffIcon className="size-8 text-muted-foreground" />
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            "block h-auto w-full object-contain",
            !loaded && "invisible",
            className,
          )}
          onLoad={(e) => {
            if (typeof src === "string") setLoadedSrc(src);
            onLoad?.(e);
          }}
          onError={(e) => {
            if (typeof src === "string") setErrorSrc(src);
            onError?.(e);
          }}
          {...props}
        />
      )}
    </div>
  );
}

function ImageFilename({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  if (!children) return null;

  return (
    <span
      data-slot="image-filename"
      className={cn(
        "block truncate px-2 py-1.5 text-muted-foreground text-xs",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

type ImageZoomProps = PropsWithChildren<{
  src: string;
  alt?: string;
}>;

function ImageZoom({ src, alt = "Image preview", children }: ImageZoomProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <div
        onClick={handleOpen}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        role="button"
        tabIndex={0}
        className="aui-image-zoom-trigger cursor-zoom-in"
        aria-label="Click to zoom image"
      >
        {children}
      </div>
      {isMounted &&
        isOpen &&
        createPortal(
          <div
            data-slot="image-zoom-overlay"
            role="button"
            tabIndex={0}
            className="aui-image-zoom-overlay fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 duration-200"
            onClick={handleClose}
            onKeyDown={(e) => e.key === "Enter" && handleClose()}
            aria-label="Close zoomed image"
          >
            <img
              data-slot="image-zoom-content"
              src={src}
              alt={alt}
              className="aui-image-zoom-content fade-in zoom-in-95 max-h-[90vh] max-w-[90vw] animate-in cursor-zoom-out object-contain duration-200"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

function ImageGenerating({ className }: { className?: string }) {
  return (
    <div
      data-slot="image-generating"
      className={cn(
        "flex min-h-32 items-center justify-center bg-muted/50 p-4",
        className,
      )}
    >
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      <span className="sr-only">Generating image…</span>
    </div>
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
    <div
      data-slot="image-content-filter-error"
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-2 bg-muted/50 p-4 text-center",
        className,
      )}
    >
      <ShieldAlertIcon className="size-8 text-muted-foreground" />
      <p className="font-medium text-sm">Image could not be generated</p>
      {reason && <p className="text-muted-foreground text-xs">{reason}</p>}
    </div>
  );
}

export type ImageActionsProps = {
  part: ImageMessagePart;
  adapter?: ImageGenerationAdapter;
  regenerateOptions?: UseImagePartRegenerateOptions;
  /** Fires when a regenerate call starts (after debounce + rate-limit + confirm). */
  onRegenerateStart?: () => void;
  /** Fires when a regenerate call resolves with a result. */
  onRegenerated?: (result: ImageGenerationResult) => void;
  /** Fires when a regenerate call rejects. */
  onRegenerateError?: (error: Error) => void;
  className?: string;
};

function RegenerateButton({
  part,
  adapter,
  regenerateOptions,
  onRegenerateStart,
  onRegenerated,
  onRegenerateError,
}: {
  part: ImageMessagePart;
  adapter: ImageGenerationAdapter;
  regenerateOptions?: UseImagePartRegenerateOptions | undefined;
  onRegenerateStart?: (() => void) | undefined;
  onRegenerated?: ((result: ImageGenerationResult) => void) | undefined;
  onRegenerateError?: ((error: Error) => void) | undefined;
}) {
  const wiredOptions = regenerateOptions
    ? {
        ...regenerateOptions,
        observers: {
          ...regenerateOptions.observers,
          onStart: (info: { prompt: string; model?: string | undefined }) => {
            regenerateOptions.observers?.onStart?.(info);
            onRegenerateStart?.();
          },
        },
      }
    : onRegenerateStart
      ? { observers: { onStart: () => onRegenerateStart() } }
      : undefined;
  const { regenerate, isRegenerating } = useImagePartRegenerate(
    part,
    adapter,
    wiredOptions,
  );
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const result = await regenerate();
          if (result) onRegenerated?.(result);
        } catch (err) {
          onRegenerateError?.(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      }}
      disabled={isRegenerating}
      data-slot="image-regenerate"
      aria-label="Regenerate image"
      className="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
    >
      <RefreshCwIcon
        className={cn("size-4", isRegenerating && "animate-spin")}
      />
    </button>
  );
}

function ImageActions({
  part,
  adapter,
  regenerateOptions,
  onRegenerateStart,
  onRegenerated,
  onRegenerateError,
  className,
}: ImageActionsProps) {
  const download = useImagePartDownload(part);
  const copy = useImagePartCopy(part);

  return (
    <div
      data-slot="image-actions"
      className={cn("flex items-center gap-1 p-1", className)}
    >
      <button
        type="button"
        onClick={download}
        data-slot="image-download"
        aria-label="Download image"
        className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
      >
        <DownloadIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          copy().catch(() => {});
        }}
        data-slot="image-copy"
        aria-label="Copy image"
        className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
      >
        <CopyIcon className="size-4" />
      </button>
      {adapter && part.prompt && (
        <RegenerateButton
          part={part}
          adapter={adapter}
          regenerateOptions={regenerateOptions}
          onRegenerateStart={onRegenerateStart}
          onRegenerated={onRegenerated}
          onRegenerateError={onRegenerateError}
        />
      )}
    </div>
  );
}

const ImageImpl: ImageMessagePartComponent = (props) => {
  const { image, filename, status } = props;

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
  Actions: typeof ImageActions;
  Generating: typeof ImageGenerating;
  ContentFilterError: typeof ImageContentFilterError;
};

Image.displayName = "Image";
Image.Root = ImageRoot;
Image.Preview = ImagePreview;
Image.Filename = ImageFilename;
Image.Zoom = ImageZoom;
Image.Actions = ImageActions;
Image.Generating = ImageGenerating;
Image.ContentFilterError = ImageContentFilterError;

export {
  Image,
  ImageRoot,
  ImagePreview,
  ImageFilename,
  ImageZoom,
  ImageActions,
  ImageGenerating,
  ImageContentFilterError,
  imageVariants,
};
