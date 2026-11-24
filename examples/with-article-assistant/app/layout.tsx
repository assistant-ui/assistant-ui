import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Article Assistant",
  description:
    "A news article with an assistant that answers questions about it.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // appOS's sandbox puts the shell's "dark" class on <html> before the first paint.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
