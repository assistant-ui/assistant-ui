import type { Metadata } from "next";
import { ReactNode } from "react";
import { OpenSkybridgeLayoutClient } from "./openskybridge-layout-client";

export const metadata: Metadata = {
  title: "OpenSkyBridge - assistant-ui",
  description:
    "Bridge the OpenAI widget API to any host environment via postMessage.",
};

export default function OpenSkybridgeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <OpenSkybridgeLayoutClient>{children}</OpenSkybridgeLayoutClient>;
}
