"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inkButton, mono } from "@/components/elements/surfaces";

export function DemoCard({
  href,
  index,
  title,
  description,
  wide = false,
  children,
}: {
  href: string;
  index: number;
  title: string;
  description: string;
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
      className={cn("group flex flex-col", wide && "md:col-span-2")}
    >
      <div className="group/canvas bg-foreground/[0.025] dark:bg-foreground/[0.04] relative flex h-[360px] items-center justify-center overflow-hidden rounded-[20px] p-6 md:p-10">
        {mounted ? (
          <div className="flex h-full w-full items-center justify-center">
            {children}
          </div>
        ) : null}
        <Link
          href={href}
          aria-hidden
          tabIndex={-1}
          className="absolute inset-0 z-[5] pointer-fine:hidden"
        />
        <div className="bg-background/55 pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-focus-within/canvas:opacity-100 group-hover/canvas:opacity-100 motion-reduce:transition-none">
          <Link
            href={href}
            aria-label={`View ${title}`}
            className={cn(
              inkButton,
              "pointer-events-auto flex h-8 scale-[0.96] items-center gap-1.5 rounded-full px-4 text-[12.5px] font-medium group-hover/canvas:scale-100",
            )}
          >
            View
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
        </div>
      </div>
      <Link href={href} className="group/link mt-4 flex items-baseline gap-2.5">
        <span className={cn(mono, "text-foreground/30 tabular-nums")}>
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="text-[13.5px] font-medium group-hover/link:underline group-hover/link:underline-offset-4">
          {title}
        </h3>
      </Link>
      <p className="text-foreground/50 mt-1 text-[13px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
