import type { Metadata } from "next";
import SearchEngineDemo from "./search-engine";

export const metadata: Metadata = { title: "Search engine" };

export default function Page() {
  return <SearchEngineDemo />;
}
