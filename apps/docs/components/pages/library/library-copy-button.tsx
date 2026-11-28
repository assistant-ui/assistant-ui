"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { cn } from "@/lib/utils";
import { LibraryIconButton } from "./library-icon-button";
import { libraryToast } from "./library-toast";

const COPIED_MS = 1600;

// The swap matches the site's copy buttons (iconSwap in the kit's surfaces).
const swap =
  "[grid-area:1/1] size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";
const shown = "scale-100 opacity-100 blur-none";
const hidden = "scale-[0.25] opacity-0 blur-[4px]";

/** An icon button that copies `text` and shows a check for a moment once it has. */
export function LibraryCopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <LibraryIconButton
      tooltip={copied ? "Copied" : label}
      onClick={async () => {
        if (!(await copyTextToClipboard(text))) {
          libraryToast.error("The clipboard is not available.");
          return;
        }
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
      }}
      className={cn(
        "grid place-items-center",
        copied && "text-foreground",
        className,
      )}
    >
      <CopyIcon aria-hidden className={cn(swap, copied ? hidden : shown)} />
      <CheckIcon aria-hidden className={cn(swap, copied ? shown : hidden)} />
    </LibraryIconButton>
  );
}
