"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { DownloadIcon, SquareDashedIcon, TypeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

type BrandAssetsMenuProps = {
  children: ReactElement;
};

type HeaderBrandLinkProps = {
  className?: string;
  labelClassName?: string;
};

export function HeaderBrandLink({
  className,
  labelClassName,
}: HeaderBrandLinkProps) {
  return (
    <BrandAssetsMenu>
      <Link
        href="/"
        className={cn("flex shrink-0 items-center gap-2", className)}
      >
        <Image
          src="/favicon/icon.svg"
          alt="assistant-ui logo"
          width={18}
          height={18}
          className="dark:hue-rotate-180 dark:invert"
        />
        <span className={cn("font-medium tracking-tight", labelClassName)}>
          assistant-ui
        </span>
      </Link>
    </BrandAssetsMenu>
  );
}

function BrandAssetsMenu({ children }: BrandAssetsMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onSelect={() => void copySvg("Logomark as SVG", "/favicon/icon.svg")}
        >
          <Image
            src="/favicon/icon.svg"
            alt=""
            width={16}
            height={16}
            className="size-4 dark:hue-rotate-180 dark:invert"
          />
          Copy Logomark as SVG
        </ContextMenuItem>

        <ContextMenuItem
          onSelect={() =>
            void copySvg("Logotype as SVG", "/brand/logotype.svg")
          }
        >
          <TypeIcon className="size-4" />
          Copy Logotype as SVG
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem asChild>
          <Link href="/brand">
            <SquareDashedIcon className="size-4" />
            Brand Guidelines
          </Link>
        </ContextMenuItem>

        <ContextMenuItem asChild>
          <a href="/assistant-ui-brand.zip" download>
            <DownloadIcon className="size-4" />
            Download Brand Assets
          </a>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ClipboardItem wraps the pending fetch so the clipboard write starts inside
// the user activation window; Safari rejects a write that awaits the fetch.
const copySvg = async (label: string, path: string) => {
  try {
    const svg = fetch(path).then(async (response) => {
      if (!response.ok) throw new Error("Failed to load SVG");
      return new Blob([await response.text()], { type: "text/plain" });
    });
    await navigator.clipboard.write([new ClipboardItem({ "text/plain": svg })]);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};
