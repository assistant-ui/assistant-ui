"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RENDERER_PATH } from "@/lib/renderer";

export function OutsideRenderer({ children }: { children: ReactNode }) {
  return usePathname() === RENDERER_PATH ? null : children;
}
