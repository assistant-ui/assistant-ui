"use client";

import {
  memo,
  useEffect,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import {
  DownloadIcon,
  Maximize2Icon,
  PlayIcon,
  VideoOffIcon,
  XIcon,
} from "lucide-react";
import type { VideoMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

let videoZoomLockCount = 0;
let originalBodyOverflow: string | undefined;

const videoVariants = cva(
  "aui-video-root relative overflow-hidden rounded-lg",
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

export type VideoRootProps = ComponentProps<"div"> &
  VariantProps<typeof videoVariants>;

function VideoRoot({
  className,
  variant,
  size,
  children,
  ...props
}: VideoRootProps) {
  return (
    <div
      data-slot="video-root"
      data-variant={variant}
      data-size={size}
      className={cn(videoVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </div>
  );
}

type VideoPlayerProps = ComponentProps<"video"> & {
  containerClassName?: string;
};

function VideoPlayer({
  className,
  containerClassName,
  children,
  onError,
  src,
  poster,
  ...props
}: VideoPlayerProps) {
  const [errorSrc, setErrorSrc] = useState<string | undefined>(undefined);
  const error = errorSrc !== undefined && errorSrc === src;

  return (
    <div
      data-slot="video-player-container"
      className={cn(
        "relative aspect-video w-full bg-muted/50",
        containerClassName,
      )}
    >
      {error ? (
        <div
          data-slot="video-player-error"
          className="flex min-h-32 items-center justify-center p-4"
        >
          <VideoOffIcon className="size-8 text-muted-foreground" />
        </div>
      ) : (
        <video
          data-slot="video-player"
          src={src}
          poster={poster}
          controls
          preload="metadata"
          className={cn("block size-full bg-black object-contain", className)}
          onError={(e) => {
            if (typeof src === "string") setErrorSrc(src);
            onError?.(e);
          }}
          {...props}
        >
          {children}
        </video>
      )}
    </div>
  );
}

type VideoPosterProps = ComponentProps<"img"> & { src?: string };

function VideoPoster({
  src,
  className,
  alt = "Video preview",
  ...props
}: VideoPosterProps) {
  if (!src) {
    return (
      <div
        data-slot="video-poster-placeholder"
        className="flex aspect-video w-full items-center justify-center bg-muted/50"
      >
        <PlayIcon className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      data-slot="video-poster"
      src={src}
      alt={alt}
      className={cn("block aspect-video w-full object-cover", className)}
      {...props}
    />
  );
}

function VideoFilename({
  className,
  children,
  ...props
}: ComponentProps<"span">) {
  if (!children) return null;

  return (
    <span
      data-slot="video-filename"
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

type VideoDownloadProps = Omit<ComponentProps<"a">, "href"> & {
  url?: string | undefined;
  filename?: string | undefined;
};

function VideoDownload({
  url,
  filename,
  className,
  children,
  ...props
}: VideoDownloadProps) {
  if (!url) return null;

  return (
    <a
      data-slot="video-download"
      href={url}
      download={filename ?? "video"}
      className={cn(
        "absolute end-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background",
        className,
      )}
      aria-label="Download video"
      {...props}
    >
      {children ?? <DownloadIcon className="size-4" />}
    </a>
  );
}

function VideoOverlay({ children }: PropsWithChildren) {
  if (!children) return null;

  return (
    <div
      data-slot="video-overlay"
      className="pointer-events-none absolute start-2 top-2 max-w-[calc(100%-6rem)] rounded-md bg-background/80 px-2 py-1 text-foreground shadow-sm backdrop-blur"
    >
      {children}
    </div>
  );
}

type VideoZoomProps = PropsWithChildren<{
  src?: string | undefined;
  poster?: string | undefined;
  label?: string | undefined;
  sources?: readonly { src: string; type?: string | undefined }[] | undefined;
}>;

function VideoZoom({
  src,
  poster,
  label = "Video preview",
  sources,
  children,
}: VideoZoomProps) {
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
    if (videoZoomLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
    }
    videoZoomLockCount += 1;
    document.body.style.overflow = "hidden";
    return () => {
      videoZoomLockCount -= 1;
      if (videoZoomLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow ?? "";
        originalBodyOverflow = undefined;
      }
    };
  }, [isOpen]);

  return (
    <>
      {children}
      <button
        type="button"
        data-slot="video-zoom-trigger"
        className="absolute end-12 top-2 inline-flex size-8 items-center justify-center rounded-md bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
        aria-label="Expand video"
        onClick={handleOpen}
      >
        <Maximize2Icon className="size-4" />
      </button>
      {isMounted &&
        isOpen &&
        createPortal(
          <div
            data-slot="video-zoom-overlay"
            role="dialog"
            aria-modal="true"
            className="aui-video-zoom-overlay fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 p-4 duration-200"
            aria-label="Expanded video"
          >
            <button
              type="button"
              data-slot="video-zoom-close"
              className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
              aria-label="Close expanded video"
              onClick={handleClose}
            >
              <XIcon className="size-4" />
            </button>
            {/* biome-ignore lint/a11y/useMediaCaption: videos may be generated content without captions */}
            <video
              data-slot="video-zoom-content"
              src={src}
              poster={poster}
              controls
              autoPlay
              className="aui-video-zoom-content fade-in zoom-in-95 max-h-[90vh] max-w-[90vw] animate-in bg-black object-contain duration-200"
              aria-label={label}
            >
              {sources?.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
            </video>
          </div>,
          document.body,
        )}
    </>
  );
}

const VideoImpl: VideoMessagePartComponent = ({ url, posterUrl, filename }) => {
  return (
    <VideoRoot>
      <VideoZoom src={url} poster={posterUrl} label={filename}>
        <VideoPlayer src={url} poster={posterUrl} />
      </VideoZoom>
      <VideoDownload url={url} filename={filename} />
      <VideoOverlay>
        <VideoFilename>{filename}</VideoFilename>
      </VideoOverlay>
    </VideoRoot>
  );
};

const Video = memo(VideoImpl) as unknown as VideoMessagePartComponent & {
  Root: typeof VideoRoot;
  Player: typeof VideoPlayer;
  Poster: typeof VideoPoster;
  Filename: typeof VideoFilename;
  Download: typeof VideoDownload;
  Overlay: typeof VideoOverlay;
  Zoom: typeof VideoZoom;
};

Video.displayName = "Video";
Video.Root = VideoRoot;
Video.Player = VideoPlayer;
Video.Poster = VideoPoster;
Video.Filename = VideoFilename;
Video.Download = VideoDownload;
Video.Overlay = VideoOverlay;
Video.Zoom = VideoZoom;

export {
  Video,
  VideoRoot,
  VideoPlayer,
  VideoPoster,
  VideoFilename,
  VideoDownload,
  VideoOverlay,
  VideoZoom,
  videoVariants,
};
