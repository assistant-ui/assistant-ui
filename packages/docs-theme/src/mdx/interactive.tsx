"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import { cn } from "../site/utils";

export function Files({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("aui-docs-files not-prose", className)} />
  );
}

export function File({
  name,
  icon = <FileIcon />,
  className,
  ...props
}: ComponentProps<"div"> & { name: ReactNode; icon?: ReactNode }) {
  return (
    <div {...props} className={cn("aui-docs-files-item", className)}>
      {icon}
      {name}
    </div>
  );
}

export function Folder({
  name,
  defaultOpen = false,
  children,
  ...props
}: ComponentProps<"div"> & { name: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div {...props}>
      <button
        type="button"
        aria-expanded={open}
        className="aui-docs-files-item"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <FolderOpenIcon /> : <FolderIcon />}
        {name}
        <ChevronRightIcon className="aui-docs-files-chevron" />
      </button>
      {open && <div className="aui-docs-files-children">{children}</div>}
    </div>
  );
}
