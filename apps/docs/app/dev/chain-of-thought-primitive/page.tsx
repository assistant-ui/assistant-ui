import type { Metadata } from "next";

import { ChainOfThoughtPrimitiveWorkbenchClient } from "./ui-demo.client";

export const metadata: Metadata = {
  title: "Chain of Thought Primitive Workbench",
};

export default function ChainOfThoughtPrimitiveWorkbenchPage() {
  return <ChainOfThoughtPrimitiveWorkbenchClient />;
}
