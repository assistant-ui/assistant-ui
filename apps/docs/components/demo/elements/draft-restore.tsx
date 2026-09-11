"use client";

import { useEffect, useState } from "react";
import { DraftRestore } from "@/components/assistant-ui/elements/draft-restore";

export function DraftRestoreDemo() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissed) return;
    const id = setTimeout(() => setDismissed(false), 1800);
    return () => clearTimeout(id);
  }, [dismissed]);

  if (dismissed) return <div className="h-[3.25rem] w-full max-w-sm" />;

  return (
    <DraftRestore
      draft="Add a regression test for draft restore across thread switches"
      savedAt="2 minutes ago"
      onRestore={() => setDismissed(true)}
      onDiscard={() => setDismissed(true)}
    />
  );
}
