import type { Metadata } from "next";
import type { ReactNode } from "react";
import { subProject } from "@/lib/docs-sites";

const { title, description } = subProject("native");

export const metadata: Metadata = { title, description };

export default function ReactNativeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
