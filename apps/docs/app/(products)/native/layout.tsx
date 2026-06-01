import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { createOgMetadata } from "@/lib/og";

const title = "assistant-ui for React Native";
const description =
  "Get the UX of ChatGPT in your own mobile app. Full Expo support, cross-platform code sharing, powered by the assistant-ui runtime.";

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
