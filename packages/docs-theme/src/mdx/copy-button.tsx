"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      clearTimeout(timer.current);
    };
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    // The write can settle after the button is gone, and a confirmation
    // started then would outlive the cleanup that was meant to cancel it.
    if (unmounted.current) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return { copied, copy };
}

const codeOf = (event: MouseEvent<HTMLButtonElement>) =>
  event.currentTarget
    .closest(".aui-docs-codeblock")
    ?.querySelector(".aui-docs-codeblock-viewport pre")?.textContent ?? "";

/** Copies `text`, or else the code shown in the enclosing code block. */
export function CopyButton({
  text,
  floating,
}: {
  text?: string | undefined;
  floating?: boolean;
}) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      aria-label="Copy code"
      data-floating={floating ? "" : undefined}
      className="aui-docs-codeblock-copy"
      onClick={(event) => void copy(text ?? codeOf(event))}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

/** Copies the page URL pointing at the heading `id`. */
export function CopyAnchorButton({ id }: { id: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      aria-label="Copy anchor link"
      className="aui-docs-heading-anchor not-prose"
      onClick={() => {
        const url = new URL(window.location.href);
        url.hash = id;
        void copy(url.href);
      }}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
}
