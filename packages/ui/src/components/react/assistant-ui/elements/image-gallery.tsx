"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ImageOffIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { cn } from "@/lib/utils";
import { safeHref } from "../utils/href";
import { clamp } from "../utils/range";
import { field, floating, ghostButton, mono } from "./surfaces";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string | undefined;
  source?: { label?: string | undefined; url?: string | undefined } | undefined;
}

export interface ImageGalleryProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  images: readonly GalleryImage[];
  maxVisible?: number | undefined;
  onOpen?: ((id: string) => void) | undefined;
}

const keyForImage = (image: GalleryImage) => `${image.id}\u0000${image.src}`;

export function ImageGallery({
  images,
  maxVisible = 6,
  onOpen,
  className,
  ...props
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const index =
    activeIndex === null
      ? 0
      : Math.floor(clamp(activeIndex, 0, Math.max(0, images.length - 1)));
  const activeImage = activeIndex === null ? undefined : images[index];
  const sourceHref = safeHref(activeImage?.source?.url);
  const visibleCount = Math.floor(clamp(maxVisible, 1, images.length));
  const visibleImages = images.slice(0, visibleCount);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setActiveIndex(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || activeImage === undefined) return;
    if (!dialog.open) dialog.showModal();

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        setActiveIndex(index - 1);
      } else if (event.key === "ArrowRight" && index < images.length - 1) {
        event.preventDefault();
        setActiveIndex(index + 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage, images.length, index]);

  const open = (nextIndex: number, trigger: HTMLButtonElement) => {
    const image = images[nextIndex];
    if (!image) return;
    triggerRef.current = trigger;
    setActiveIndex(nextIndex);
    onOpen?.(image.id);
  };

  const markFailed = (image: GalleryImage) => {
    const key = keyForImage(image);
    setFailedImages((current) =>
      current.has(key) ? current : new Set(current).add(key),
    );
  };

  if (images.length === 0) return null;

  return (
    <div
      data-slot="image-gallery"
      className={cn("@container w-full max-w-md", className)}
      {...props}
    >
      <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3">
        {visibleImages.map((image, imageIndex) => {
          const failed = failedImages.has(keyForImage(image));
          const overflow =
            imageIndex === visibleCount - 1 && images.length > visibleCount;

          return (
            <button
              key={image.id}
              type="button"
              aria-label={`Open image: ${image.alt}`}
              onClick={(event) => open(imageIndex, event.currentTarget)}
              className={cn(
                field,
                "focus-visible:ring-foreground/30 relative aspect-square overflow-hidden rounded-xl transition-[transform,background-color] duration-150 outline-none hover:scale-[1.01] focus-visible:ring-1 active:scale-[0.98] motion-reduce:transition-none",
              )}
            >
              {failed ? (
                <span className="text-foreground/35 flex size-full items-center justify-center">
                  <ImageOffIcon aria-hidden className="size-6" />
                </span>
              ) : (
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  className="size-full object-cover"
                  onError={() => markFailed(image)}
                />
              )}
              {overflow ? (
                <span className="bg-foreground/65 text-background absolute inset-0 flex items-center justify-center text-lg font-medium">
                  +{images.length - visibleCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {activeImage ? (
        <dialog
          ref={dialogRef}
          aria-label={`Image ${index + 1} of ${images.length}`}
          className="backdrop:bg-foreground/65 fixed inset-0 flex h-dvh max-h-none w-dvw max-w-none items-center justify-center border-0 bg-transparent p-4"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onClose={close}
        >
          <div
            className={cn(
              floating,
              "fade-in animate-in relative flex w-full max-w-4xl flex-col gap-3 rounded-xl p-3 shadow-lg duration-150 motion-reduce:animate-none",
            )}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className={cn(ghostButton, "absolute end-2 top-2 z-10 size-8")}
            >
              <XIcon aria-hidden className="size-4" />
            </button>
            <div className="flex min-h-0 items-center justify-center px-10">
              {failedImages.has(keyForImage(activeImage)) ? (
                <div className="text-foreground/35 flex h-[min(75vh,32rem)] w-full items-center justify-center">
                  <ImageOffIcon aria-hidden className="size-8" />
                </div>
              ) : (
                <img
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="max-h-[75vh] max-w-full object-contain"
                  onError={() => markFailed(activeImage)}
                />
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label="Previous image"
                disabled={index === 0}
                onClick={() => setActiveIndex(index - 1)}
                className={cn(
                  ghostButton,
                  "size-8 shrink-0 disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <ChevronLeftIcon aria-hidden className="size-4" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                {activeImage.caption ? (
                  <p className="text-foreground/75 truncate">
                    {activeImage.caption}
                  </p>
                ) : null}
                {activeImage.source?.label ? (
                  sourceHref ? (
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/50 hover:text-foreground/80 flex min-w-0 items-center gap-1 truncate transition-colors"
                    >
                      <span className="truncate">
                        {activeImage.source.label}
                      </span>
                      <ExternalLinkIcon
                        aria-hidden
                        className="size-3 shrink-0"
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="text-foreground/50 truncate">
                      {activeImage.source.label}
                    </span>
                  )
                ) : null}
              </div>
              <span className={cn(mono, "text-foreground/45 shrink-0")}>
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                aria-label="Next image"
                disabled={index === images.length - 1}
                onClick={() => setActiveIndex(index + 1)}
                className={cn(
                  ghostButton,
                  "size-8 shrink-0 disabled:pointer-events-none disabled:opacity-30",
                )}
              >
                <ChevronRightIcon aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
