import type { ReactNode } from "react";

export const metadata = {
  title: "react-mcp test",
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
          maxWidth: 880,
        }}
      >
        {children}
      </body>
    </html>
  );
}
