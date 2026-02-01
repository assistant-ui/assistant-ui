"use client";

import { useCallback, useEffect, useState } from "react";

function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}

export function useCopyToClipboard(options?: { resetAfterMs?: number }): {
  copiedId: string | null;
  copy: (text: string, id?: string) => Promise<boolean>;
} {
  const resetAfterMs = options?.resetAfterMs ?? 2000;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback(async (text: string, id: string = "default") => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = fallbackCopyToClipboard(text);
      }
    } catch {
      ok = fallbackCopyToClipboard(text);
    }

    if (ok) {
      setCopiedId(id);
    }

    return ok;
  }, []);

  useEffect(() => {
    if (!copiedId) return;
    const timeout = setTimeout(() => setCopiedId(null), resetAfterMs);
    return () => clearTimeout(timeout);
  }, [copiedId, resetAfterMs]);

  return { copiedId, copy };
}
