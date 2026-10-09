"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Check, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const itemClassName =
  "flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-[13px] tracking-tight transition-colors outline-none select-none data-[highlighted]:bg-foreground/5";

/** A project or platform entry; the check indicator keeps its space when unchecked so labels align. */
export function ProjectMenuRadioItem({
  value,
  icon,
  children,
}: {
  value: string;
  icon: ReactNode;
  children: ReactNode;
}): React.ReactElement {
  return (
    <MenuPrimitive.RadioItem
      value={value}
      closeOnClick
      className={cn(
        itemClassName,
        "data-[checked]:bg-foreground/6 data-[checked]:font-medium",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      <MenuPrimitive.RadioItemIndicator
        keepMounted
        className="flex shrink-0 data-[unchecked]:invisible"
      >
        <Check className="text-foreground size-3.5" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function OtherOssProjectsItem(): React.ReactElement {
  const router = useRouter();
  return (
    <MenuPrimitive.Item
      closeOnClick
      onClick={() => router.push("/oss")}
      className={itemClassName}
    >
      <LayoutGrid className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">
        Other OSS projects
      </span>
      <span className="size-3.5 shrink-0" />
    </MenuPrimitive.Item>
  );
}
