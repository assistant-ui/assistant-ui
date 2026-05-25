import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "react-mcp",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-background text-foreground min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
