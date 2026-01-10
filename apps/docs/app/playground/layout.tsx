import { Metadata } from "next";

import { PlaygroundRuntimeProvider } from "@/contexts/PlaygroundRuntimeProvider";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Experiment with different configurations and settings using the Assistant UI Playground.",
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlaygroundRuntimeProvider>{children}</PlaygroundRuntimeProvider>;
}
