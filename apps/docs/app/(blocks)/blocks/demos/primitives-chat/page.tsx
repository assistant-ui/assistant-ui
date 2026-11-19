import type { Metadata } from "next";
import { Chat } from "./components/chat";

export const metadata: Metadata = { title: "Primitives chat" };

export default function Page() {
  return <Chat />;
}
