import type { Metadata } from "next";
import GeminiDemo from "./gemini";

export const metadata: Metadata = { title: "Gemini" };

export default function Page() {
  return <GeminiDemo />;
}
