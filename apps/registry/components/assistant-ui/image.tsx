"use client";

import { memo, useState, type FC, type PropsWithChildren } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ImageIcon, ImageOffIcon } from "lucide-react";
import type { ImageMessagePartComponent } from "@assistant-ui/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const imageVariants = cva(
  "aui-image-root relative overflow-hidden rounded-lg",
  {
    variants: {
      variant: {
        default: "border border-border bg-muted/30",
        bordered: "border-2 border-border",
        ghost: "",
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

type ImagePreviewProps = React.ComponentProps<"img"> & {
  isLoading?: boolean;
};

function ImagePreview({
  className,
  isLoading,
  onLoad,
  onError,
  alt = "Image content",
  ...props
}: ImagePreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        data-slot="image-preview-error"
        className={cn(
          "flex min-h-32 items-center justify-center bg-muted/50 p-4",
          className,
        )}
      >
        <ImageOffIcon className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div
          data-slot="image-preview-loading"
          className="flex min-h-32 items-center justify-center bg-muted/50 p-4"
        >
          <ImageIcon className="size-8 animate-pulse text-muted-foreground" />
        </div>
      )}
      <img
        data-slot="image-preview"
        alt={alt}
        className={cn(
          "block h-auto w-full object-contain",
          !loaded && "hidden",
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
    </>
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

type ImageDialogProps = PropsWithChildren<{
  src: string;
  alt?: string;
}>;

const ImageDialog: FC<ImageDialogProps> = ({
  src,
  alt = "Image preview",
  children,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Dialog>
      <DialogTrigger
        className="aui-image-dialog-trigger cursor-pointer transition-opacity hover:opacity-80"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-image-dialog-content p-2 sm:max-w-4xl [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="aui-sr-only sr-only">Image Preview</DialogTitle>
        <div className="aui-image-dialog-preview relative mx-auto flex max-h-[85dvh] w-full items-center justify-center overflow-hidden bg-background">
          <img
            src={src}
            alt={alt}
            className={cn(
              "block h-auto max-h-[85dvh] w-auto max-w-full object-contain",
              isLoaded
                ? "aui-image-dialog-loaded"
                : "aui-image-dialog-loading invisible",
            )}
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ImageImpl: ImageMessagePartComponent = ({ image, filename }) => {
  return (
    <ImageRoot>
      <ImageDialog src={image} alt={filename || "Image content"}>
        <div>
          <ImagePreview src={image} alt={filename || "Image content"} />
        </div>
      </ImageDialog>
      <ImageFilename>{filename}</ImageFilename>
    </ImageRoot>
  );
};

const Image = memo(ImageImpl) as unknown as ImageMessagePartComponent & {
  Root: typeof ImageRoot;
  Preview: typeof ImagePreview;
  Filename: typeof ImageFilename;
  Dialog: typeof ImageDialog;
};

Image.displayName = "Image";
Image.Root = ImageRoot;
Image.Preview = ImagePreview;
Image.Filename = ImageFilename;
Image.Dialog = ImageDialog;

export {
  Image,
  ImageRoot,
  ImagePreview,
  ImageFilename,
  ImageDialog,
  imageVariants,
};
