import type { Metadata } from "next";
import { ReactNode } from "react";
import { TwShimmerLayoutClient } from "./tw-shimmer-layout-client";

export const metadata: Metadata = {
  title: "tw-shimmer by assistant-ui",
  description:
    "A zero-dependency Tailwind CSS v4 plugin for beautiful shimmer effects. Fully customizable, performant, and easy to use.",
};

export default function TwShimmerLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <TwShimmerLayoutClient>{children}</TwShimmerLayoutClient>;
}
