import type { ReactNode } from "react";

export const metadata = {
  title: "GitHub MCP showcase",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          margin: 0,
          padding: 24,
          maxWidth: 980,
          color: "#111",
          background: "#fff",
        }}
      >
        {children}
      </body>
    </html>
  );
}
