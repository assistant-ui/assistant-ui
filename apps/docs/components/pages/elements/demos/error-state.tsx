"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/elements/error-state";

export function ErrorStateDemo() {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!retrying) return undefined;
    const id = setTimeout(() => setRetrying(false), 1600);
    return () => clearTimeout(id);
  }, [retrying]);

  return (
    <div className="flex min-h-[4.75rem] w-full max-w-sm items-center">
      <ErrorState
        title="Generation stopped"
        detail="The model hit the output limit after 4,096 tokens."
        retrying={retrying}
        onRetry={() => setRetrying(true)}
      />
    </div>
  );
}
