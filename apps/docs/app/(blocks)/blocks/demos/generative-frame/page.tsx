import type { Metadata } from "next";
import { GenerativeFrame } from "./components/generative-frame";

export const metadata: Metadata = { title: "Generative frame" };

export default function Page() {
  return <GenerativeFrame />;
}
