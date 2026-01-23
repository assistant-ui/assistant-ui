"use client";

import {
  memo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { ImageIcon, ImageOffIcon } from "lucide-react";
import type { ImageMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const imageVariants = cva(
  "aui-image-root relative overflow-hidden rounded-lg",
  {
    variants: {
      variant: {
        default: "border border-border",
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
      variant: "default",
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
  ...props
}: ImagePreviewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Handle cached images that may already be complete
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

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
          alt={alt}
          className={cn(
            "block h-auto w-full object-contain",
            !loaded && "invisible",
            className,
          )}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setError(true);
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

  // SSR safety: only render portal on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
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

const ImageImpl: ImageMessagePartComponent = ({ image, filename }) => {
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
};

Image.displayName = "Image";
Image.Root = ImageRoot;
Image.Preview = ImagePreview;
Image.Filename = ImageFilename;
Image.Zoom = ImageZoom;

export {
  Image,
  ImageRoot,
  ImagePreview,
  ImageFilename,
  ImageZoom,
  imageVariants,
};
