"use client";

import { memo, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { SourceMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const getDomainInitial = (url: string): string => {
  const domain = extractDomain(url);
  return domain.charAt(0).toUpperCase();
};

const sourceVariants = cva(
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        outline:
          "border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        muted: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
      },
      size: {
        default: "px-2 py-1",
        sm: "px-1.5 py-0.5",
        lg: "px-2.5 py-1.5",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

function SourceIcon({
  url,
  className,
  ...props
}: React.ComponentProps<"span"> & { url: string }) {
  const [hasError, setHasError] = useState(false);
  const domain = extractDomain(url);

  if (hasError) {
    return (
      <span
        data-slot="source-icon-fallback"
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-muted font-medium text-[10px]",
          className,
        )}
        {...props}
      >
        {getDomainInitial(url)}
      </span>
    );
  }

  return (
    <img
      data-slot="source-icon"
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className={cn("size-3.5 shrink-0 rounded-sm", className)}
      onError={() => setHasError(true)}
      {...(props as React.ComponentProps<"img">)}
    />
  );
}

function SourceTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="source-title"
      className={cn("max-w-37.5 truncate", className)}
      {...props}
    />
  );
}

export type SourceProps = React.ComponentProps<"a"> &
  VariantProps<typeof sourceVariants> & {
    asChild?: boolean;
  };

function Source({
  className,
  variant,
  size,
  asChild = false,
  target = "_blank",
  rel = "noopener noreferrer",
  ...props
}: SourceProps) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="source"
      data-variant={variant}
      data-size={size}
      target={target}
      rel={rel}
      className={cn(sourceVariants({ variant, size, className }))}
      {...props}
    />
  );
}

const SourcesImpl: SourceMessagePartComponent = ({
  url,
  title,
  sourceType,
}) => {
  if (sourceType !== "url" || !url) return null;

  const domain = extractDomain(url);
  const displayTitle = title || domain;

  return (
    <Source href={url} target="_blank" rel="noopener noreferrer">
      <SourceIcon url={url} />
      <SourceTitle>{displayTitle}</SourceTitle>
    </Source>
  );
};

const Sources = memo(SourcesImpl) as unknown as SourceMessagePartComponent & {
  Root: typeof Source;
  Icon: typeof SourceIcon;
  Title: typeof SourceTitle;
};

Sources.displayName = "Sources";
Sources.Root = Source;
Sources.Icon = SourceIcon;
Sources.Title = SourceTitle;

export { Sources, Source, SourceIcon, SourceTitle, sourceVariants };
