import type { Metadata } from "next";

import { ChainOfThoughtUiDemoClient } from "./ui-demo.client";

export const metadata: Metadata = {
  title: "Chain of Thought UI Demo",
};

export default function ChainOfThoughtUiDemoPage() {
  return <ChainOfThoughtUiDemoClient />;
}
