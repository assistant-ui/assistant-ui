import type { Metadata } from "next";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Chat" };

export default function Page() {
  return <Chat />;
}
