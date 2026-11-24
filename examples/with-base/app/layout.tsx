import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { GuestProvider } from "@/components/base/guest";
import {
  CUSTOM_THEME_COOKIE,
  CUSTOM_THEME_STYLE_ID,
  customThemeClasses,
  customThemeCss,
  parseCustomTheme,
} from "@/lib/custom-theme";
import {
  SESSION_COOKIE,
  THEME_COOKIE,
  guestFromSession,
  themeFromCookie,
} from "@/lib/guest";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "assistant-ui Base Example",
  description: "A coding agent's chat built from assistant-ui primitives.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const guest = guestFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  // No cookie means the system's theme, which the stylesheet follows itself.
  const theme = themeFromCookie(cookieStore.get(THEME_COOKIE)?.value);
  const customTheme = parseCustomTheme(
    cookieStore.get(CUSTOM_THEME_COOKIE)?.value,
  );
  const classes = [
    geist.variable,
    geistMono.variable,
    ...(theme ? [theme] : []),
    ...customThemeClasses(customTheme),
  ];

  return (
    <html lang="en" className={classes.join(" ")}>
      <body className="h-dvh">
        <style
          id={CUSTOM_THEME_STYLE_ID}
          dangerouslySetInnerHTML={{ __html: customThemeCss(customTheme) }}
        />
        <GuestProvider guest={guest}>
          <Providers>{children}</Providers>
        </GuestProvider>
      </body>
    </html>
  );
}
