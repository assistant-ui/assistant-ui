"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";

const STORAGE_KEY = "aui-ask-ai-ball";

export function AskAiBall() {
  const { open, toggle } = useAssistantPanel();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    try {
      setArmed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setArmed(true);
  }, [open]);

  if (!armed || open) return null;

  return (
    <div className="group fixed right-5 bottom-5 z-50">
      <button
        type="button"
        onClick={toggle}
        aria-label="Ask AI"
        className="animate-in fade-in-0 zoom-in-75 border-border/60 bg-background hover:border-border grid size-12 place-items-center rounded-(--radius-capsule) border transition-colors duration-300"
      >
        <span
          aria-hidden
          className="bg-foreground/80 block size-5 [mask-image:url(/favicon/icon.svg)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
        />
      </button>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          setArmed(false);
        }}
        aria-label="Dismiss Ask AI"
        className="border-border/60 bg-background text-muted-foreground hover:text-foreground absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-(--radius-capsule) border opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}
