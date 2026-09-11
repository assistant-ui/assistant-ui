"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { cn } from "@/lib/utils";

export function DemoCard({
  href,
  index,
  title,
  description,
  connection,
  wide = false,
  children,
}: {
  href: string;
  index: number;
  title: string;
  description: string;
  connection?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "group/plate flex flex-col",
        wide && "md:col-span-2 xl:col-span-3",
      )}
    >
      <div
        className={cn(
          demoCanvasClass,
          "group-hover/plate:border-foreground/25 h-[340px] transition-colors",
          wide && "md:h-[420px]",
        )}
      >
        {mounted ? (
          <div className="flex h-full min-h-0 w-full items-center justify-center">
            {children}
          </div>
        ) : null}
      </div>
      <Link
        href={href}
        aria-label={title}
        className="group/caption mt-3.5 flex items-baseline gap-2.5"
      >
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="text-[13.5px] font-medium underline-offset-4 group-hover/caption:underline">
          {title}
        </h3>
        {connection ? (
          <span className="text-muted-foreground font-mono text-[11px]">
            {connection}
          </span>
        ) : null}
        <span
          aria-hidden
          className="text-muted-foreground ms-auto self-center opacity-0 transition-opacity group-hover/plate:opacity-100 motion-reduce:transition-none"
        >
          <ArrowUpRightIcon className="size-3.5" />
        </span>
      </Link>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
