"use client";

import type { ReactNode } from "react";
import { usePathname } from "@farm.js/core/navigation";
import { EMBEDDED_PATHS } from "@/lib/embedded-paths";

export function OutsideRenderer({ children }: { children: ReactNode }) {
  return EMBEDDED_PATHS.includes(usePathname()) ? null : children;
}
