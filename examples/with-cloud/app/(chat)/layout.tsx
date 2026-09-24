import { MyRuntimeProvider } from "@/app/MyRuntimeProvider";

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MyRuntimeProvider>{children}</MyRuntimeProvider>;
}
