"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { CheckIcon, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Heading({
  as: As = "h1",
  className,
  children,
  ...props
}: ComponentProps<"h1"> & { as?: HeadingTag }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  if (!props.id) {
    return (
      <As className={className} {...props}>
        {children}
      </As>
    );
  }

  const onCopy = () => {
    if (!navigator.clipboard) return;
    const url = new URL(window.location.href);
    url.hash = props.id as string;
    navigator.clipboard.writeText(url.href).then(
      () => setCopied(true),
      () => undefined,
    );
  };

  return (
    <As
      {...props}
      className={cn(
        "group/heading flex scroll-m-28 flex-row items-center gap-1",
        className,
      )}
    >
      <a data-card="" href={`#${props.id}`}>
        {children}
      </a>
      <button
        type="button"
        aria-label="Copy anchor link"
        className="not-prose text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/heading:opacity-100 focus-visible:opacity-100"
        onClick={onCopy}
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <LinkIcon className="size-3.5" />
        )}
      </button>
    </As>
  );
}
