import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "assistant-ui for React Native";
const description =
  "Native Thread, Composer, and Message primitives for Expo. Same runtime as the web SDK.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function NativeLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <SubProjectLayout
      name="native"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-native"
    >
      {children}
    </SubProjectLayout>
  );
}
