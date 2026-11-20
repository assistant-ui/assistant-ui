import type { Metadata } from "next";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import { Base } from "./components/base";

export const metadata: Metadata = { title: "Base" };

export default function Page() {
  return (
    <DocsRuntimeProvider devtools={false}>
      <Base />
    </DocsRuntimeProvider>
  );
}
