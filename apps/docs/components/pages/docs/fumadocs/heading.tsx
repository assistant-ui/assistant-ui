"use client";

import { useRef, useState, type ComponentProps } from "react";
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  if (!props.id) {
    return (
      <As className={className} {...props}>
        {children}
      </As>
    );
  }

  const onCopy = () => {
    const url = new URL(window.location.href);
    url.hash = props.id as string;
    void navigator.clipboard.writeText(url.href);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
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
        className="not-prose text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/heading:opacity-100"
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
