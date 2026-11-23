import type { Metadata } from "next";
import { Chat } from "./components/chat";

export const metadata: Metadata = { title: "Chat basic" };

export default function Page() {
  return <Chat />;
}
