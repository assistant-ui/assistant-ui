"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { DownloadIcon, SquareDashedIcon, TypeIcon } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { toast } from "sonner";
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
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>

      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className={cn(contentClassName, "w-56")}>
          <ContextMenuPrimitive.Item
            className={itemClassName}
            onSelect={() =>
              void copySvg("Logomark as SVG", "/favicon/icon.svg")
            }
          >
            <Image
              src="/favicon/icon.svg"
              alt=""
              width={16}
              height={16}
              className="size-4 dark:hue-rotate-180 dark:invert"
            />
            Copy Logomark as SVG
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Item
            className={itemClassName}
            onSelect={() =>
              void copySvg("Logotype as SVG", "/brand/logotype.svg")
            }
          >
            <TypeIcon className="size-4" />
            Copy Logotype as SVG
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Separator className="bg-border -mx-1 my-1 h-px" />

          <ContextMenuPrimitive.Item asChild className={itemClassName}>
            <Link href="/brand">
              <SquareDashedIcon className="size-4" />
              Brand Guidelines
            </Link>
          </ContextMenuPrimitive.Item>

          <ContextMenuPrimitive.Item asChild className={itemClassName}>
            <a href="/assistant-ui-brand.zip" download>
              <DownloadIcon className="size-4" />
              Download Brand Assets
            </a>
          </ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

const copySvg = async (label: string, path: string) => {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Failed to load SVG");

    await navigator.clipboard.writeText(await response.text());
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};

const contentClassName =
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md";

const itemClassName =
  "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
