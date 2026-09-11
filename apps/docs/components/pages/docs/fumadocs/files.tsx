"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const itemClassName =
  "flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground [&_svg]:size-4";

export function Files({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("not-prose bg-card rounded-md border p-2", className)}
      {...props}
    />
  );
}

export function File({
  name,
  icon = <FileIcon />,
  className,
  ...props
}: ComponentProps<"div"> & { name: ReactNode; icon?: ReactNode }) {
  return (
    <div className={cn(itemClassName, className)} {...props}>
      {icon}
      {name}
    </div>
  );
}

export function Folder({
  name,
  defaultOpen = false,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { name: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className} {...props}>
      <button
        type="button"
        aria-expanded={open}
        className={cn(itemClassName, "w-full")}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <FolderOpenIcon /> : <FolderIcon />}
        {name}
        <ChevronRightIcon
          className={cn(
            "text-muted-foreground ms-auto transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="ms-2 flex flex-col border-l ps-2">{children}</div>
      )}
    </div>
  );
}
