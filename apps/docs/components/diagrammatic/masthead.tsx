import Link from "next/link";
import { cn } from "@/lib/utils";
import { anno, gutter, serif } from "./atlas";
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
      <span className={cn(anno, "hidden text-(--da-ink)/35 sm:inline")}>
        a field atlas of chart forms
      </span>
      <div className="ms-auto flex items-center gap-5">
        <a
          href="/"
          className={cn(
            anno,
            "text-(--da-ink)/45 transition-colors hover:text-(--da-red)",
          )}
        >
          assistant-ui ↗
        </a>
        <AtlasThemeToggle />
      </div>
    </header>
  );
}
