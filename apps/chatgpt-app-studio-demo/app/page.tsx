"use client";

import { Suspense } from "react";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";

function WorkbenchLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Suspense fallback={<WorkbenchLoading />}>
        <WorkbenchShell />
      </Suspense>
    </div>
  );
}
