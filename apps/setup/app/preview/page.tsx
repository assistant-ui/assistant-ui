import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentViewer } from "@/components/wizard/component-viewer";

export const metadata: Metadata = {
  title: "Wizard components",
  robots: { index: false, follow: false },
};

/** Every wizard page and input in its states, for working on the design. Development builds only. */
export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ComponentViewer />;
}
