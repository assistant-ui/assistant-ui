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
        <span className="relative flex h-4 items-center">
          <span
            className={cn(
              "flex items-center gap-1 transition-all duration-300",
              status === "loading"
                ? "opacity-100"
                : "-translate-y-full opacity-0",
            )}
          >
            <Loader2 className="animate-spin" />
            Loading
          </span>
          <span
            className={cn(
              "absolute inset-0 flex items-center gap-1 transition-all duration-300",
              status === "success"
                ? "translate-y-0 opacity-100"
                : "translate-y-full opacity-0",
            )}
          >
            <Check />
            Success
          </span>
        </span>
      </Badge>
    </SampleFrame>
  );
}
