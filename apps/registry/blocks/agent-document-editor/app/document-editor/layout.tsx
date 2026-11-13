import type { ReactNode } from "react";

export const metadata = {
  title: "Document editor",
  description: "Write a document with an assistant that edits it with you.",
};

export default function DocumentEditorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="bg-background h-dvh">{children}</div>;
}
