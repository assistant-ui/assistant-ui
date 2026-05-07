import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui with Assistant Transport",
  description:
    "An example of using assistant-ui with the assistant-transport runtime",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex h-screen flex-col">
          <header className="border-b bg-background px-4 py-2">
            <h1 className="font-semibold text-lg">
              Assistant Transport Example
            </h1>
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
