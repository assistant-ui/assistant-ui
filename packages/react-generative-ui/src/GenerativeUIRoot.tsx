"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const COPIED_FEEDBACK_MS = 1500;

function CopyGlyph({ copied }: { copied: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {copied ? (
        <path d="M3.5 8.5 6.5 11.5 12.5 5" />
      ) : (
        <>
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 3.5A1.5 1.5 0 0 0 9 2H4a2 2 0 0 0-2 2v5a1.5 1.5 0 0 0 1.5 1.5" />
        </>
      )}
    </svg>
  );
}

/**
 * The surface a `present` call paints into: it owns the vertical rhythm between
 * top-level blocks, which the host's message container does not provide, and
 * carries the copy affordance. The button is icon-only so it contributes
 * nothing to the text the copy reads back out of this element.
 */
export function GenerativeUIRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const copy = useCallback(() => {
    const text = ref.current?.innerText?.trim();
    if (!text || !navigator.clipboard) return;
    // A denied clipboard permission rejects; the control simply stays as it
    // was rather than reporting a copy that did not happen.
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        clearTimeout(timeout.current);
        timeout.current = setTimeout(
          () => setCopied(false),
          COPIED_FEEDBACK_MS,
        );
      },
      () => {},
    );
  }, []);

  return (
    <div data-aui="root" ref={ref}>
      {children}
      <button
        type="button"
        data-aui="root-copy"
        data-aui-copied={copied ? "" : undefined}
        aria-label={copied ? "Copied" : "Copy"}
        onClick={copy}
      >
        <CopyGlyph copied={copied} />
      </button>
    </div>
  );
}
