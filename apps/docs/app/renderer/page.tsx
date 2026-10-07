import type { Metadata } from "next";
import { RendererHost } from "@/components/pages/renderer/renderer-host";

export const metadata: Metadata = {
  title: "Conversation renderer",
  robots: { index: false, follow: false },
};

export default function RendererPage() {
  return <RendererHost />;
}
