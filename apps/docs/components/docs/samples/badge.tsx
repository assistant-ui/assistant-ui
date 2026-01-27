"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/assistant-ui/badge";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { cn } from "@/lib/utils";

export function BadgeSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-center justify-center gap-3 p-6">
      <Badge variant="outline">Outline</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="muted">Muted</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </SampleFrame>
  );
}

export function BadgeSizesSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center gap-4 p-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground text-xs">Small</span>
        <Badge size="sm">Label</Badge>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground text-xs">Default</span>
        <Badge size="default">Label</Badge>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground text-xs">Large</span>
        <Badge size="lg">Label</Badge>
      </div>
    </SampleFrame>
  );
}

export function BadgeWithIconSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center gap-3 p-6">
      <Badge variant="secondary">
        <Check />
        Success
      </Badge>
      <Badge variant="destructive">
        <X />
        Failed
      </Badge>
      <Badge variant="muted">
        <AlertCircle />
        Pending
      </Badge>
    </SampleFrame>
  );
}

export function BadgeAsLinkSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center gap-3 p-6">
      <Badge asChild variant="muted">
        <a
          href="https://github.com/assistant-ui/assistant-ui"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
          <ArrowUpRight />
        </a>
      </Badge>
      <Badge asChild variant="outline">
        <a
          href="https://www.npmjs.com/package/@assistant-ui/react"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm
          <ArrowUpRight />
        </a>
      </Badge>
    </SampleFrame>
  );
}

export function BadgeAnimatedSample() {
  const [status, setStatus] = useState<"loading" | "success">("loading");

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus((prev) => (prev === "loading" ? "success" : "loading"));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Badge
        variant={status === "loading" ? "muted" : "success"}
        className="overflow-hidden"
      >
        <span className="relative inline-flex h-4 overflow-hidden">
          <span
            className={cn(
              "invisible overflow-hidden transition-[max-width] duration-500",
              status === "loading" ? "max-w-24" : "max-w-0",
            )}
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Loader2 className="shrink-0" />
              Loading
            </span>
          </span>
          <span
            className={cn(
              "invisible overflow-hidden transition-[max-width] duration-500",
              status === "success" ? "max-w-40" : "max-w-0",
            )}
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Check className="shrink-0" />
              Mission Success
            </span>
          </span>

          <span
            className={cn(
              "absolute inset-y-0 left-0 flex items-center gap-1 whitespace-nowrap transition-all duration-500",
              status === "loading"
                ? "translate-y-0 opacity-100"
                : "-translate-y-4 opacity-0",
            )}
          >
            <Loader2 className="shrink-0 animate-spin" />
            Loading
          </span>
          <span
            className={cn(
              "absolute inset-y-0 left-0 flex items-center gap-1 whitespace-nowrap transition-all duration-500",
              status === "success"
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0",
            )}
          >
            <Check className="shrink-0" />
            Mission Success
          </span>
        </span>
      </Badge>
    </SampleFrame>
  );
}
