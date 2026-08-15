import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { gutter, meta, serif } from "./atlas";
import { AtlasThemeToggle } from "./theme-toggle";

export function Masthead() {
  return (
    <header
      className={cn(
        gutter,
        "sticky top-0 z-40 flex h-13 items-center gap-4 border-b border-(--da-line) bg-(--da-paper)",
      )}
    >
      <Link
        href="/diagrammatic"
        className={cn(serif, "text-[19px] tracking-[0.01em] italic")}
      >
        Diagrammatic
      </Link>
      <span className={cn(meta, "text-(--da-ink)/35")}>by</span>
      <a
        href="/"
        className={cn(
          meta,
          "-ml-1.5 flex items-center gap-1.5 text-(--da-ink)/60 transition-colors hover:text-(--da-red)",
        )}
      >
        <Image
          src="/favicon/icon.svg"
          alt=""
          width={14}
          height={14}
          className="size-3.5 opacity-80 dark:hue-rotate-180 dark:invert"
        />
        assistant-ui
      </a>
      <div className="ms-auto flex items-center">
        <AtlasThemeToggle />
      </div>
    </header>
  );
}
