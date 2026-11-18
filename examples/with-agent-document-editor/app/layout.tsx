import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui Agent Document Editor Example",
  description:
    "A rich text document that you and an assistant edit together, with comments and version history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.toggle("dark",new URLSearchParams(location.search).get("theme")==="dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-dvh">{children}</body>
    </html>
  );
}
