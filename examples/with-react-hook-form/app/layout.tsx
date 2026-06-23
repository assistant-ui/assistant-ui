import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MyRuntimeProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=new URLSearchParams(location.search).get("theme");var dark=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} h-dvh font-sans antialiased`}
        >
          {children}
        </body>
      </html>
    </MyRuntimeProvider>
  );
}
