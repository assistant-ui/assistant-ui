import type { Metadata } from "next";
import "./globals.css";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export const metadata: Metadata = {
  title: "LangChain useStream Example",
  description:
    "Example using @assistant-ui/react-langchain with LangChain's useStream hook.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MyRuntimeProvider>
      <html lang="en">
        <body className="h-dvh">{children}</body>
      </html>
    </MyRuntimeProvider>
  );
}
