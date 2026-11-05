"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  LinkIcon,
} from "lucide-react";
import { cn } from "../site/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Heading({
  as: As = "h1",
  className,
  children,
  ...props
}: ComponentProps<"h1"> & { as?: HeadingTag }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!props.id) {
    return (
      <As {...props} className={className}>
        {children}
      </As>
    );
  }

  const id = props.id;
  return (
    <As {...props} className={cn("aui-docs-heading", className)}>
      <a data-card="" href={`#${id}`}>
        {children}
      </a>
      <button
        type="button"
        aria-label="Copy anchor link"
        className="aui-docs-heading-anchor not-prose"
        onClick={async () => {
          const url = new URL(window.location.href);
          url.hash = id;
          try {
            await navigator.clipboard.writeText(url.href);
          } catch {
            return;
          }
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
      </button>
    </As>
  );
}

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
