"use client";

import Link from "next/link";
import Image from "next/image";
import { Builder } from "@/components/builder/builder";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";

export default function PlaygroundPage() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="shrink-0 bg-muted/40">
        <div className="flex h-11 items-center gap-2 px-5 text-sm">
          <Link
            href="/"
            className="group flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Image
              src="/favicon/icon.svg"
              alt="logo"
              width={18}
              height={18}
              className="size-[18px] opacity-40 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0 dark:hue-rotate-180 dark:invert"
            />
            <span>assistant-ui</span>
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground">playground</span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <DocsRuntimeProvider>
          <Builder />
        </DocsRuntimeProvider>
      </main>
    </div>
  );
}
