"use client";

import { EmptyState } from "@/components/elements/empty-state";

const SUGGESTIONS = [
  "Explain the runtime layers",
  "Draft a migration plan",
  "Review my composer code",
];

export function EmptyStateDemo() {
  return (
    <div className="flex w-full justify-center">
      <EmptyState greeting="Where should we start?" suggestions={SUGGESTIONS} />
    </div>
  );
}
