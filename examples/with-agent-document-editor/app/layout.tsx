import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui Agent Document Editor Example",
  description:
    "A rich text document that you and an assistant edit together, with comments and version history.",
};

// Loaded for a framing page's theme to name; the app's own text stays in the
// default font.
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Applies a theme before first paint: the mode named by `?theme=` in the
// address, then any theme a page framing this app posts to it.
const THEME_SCRIPT = `(function(){try{
var root=document.documentElement;
root.classList.toggle("dark",new URLSearchParams(location.search).get("theme")==="dark");
var props=["--primary","--primary-foreground","--ring","--radius","font-family","font-size"];
addEventListener("message",function(event){
var data=event.data;
if(event.source!==parent||!data||data.type!=="aui-block-theme")return;
if(data.mode)root.classList.toggle("dark",data.mode==="dark");
props.forEach(function(prop){
var value=data.style&&data.style[prop];
if(typeof value==="string"&&value)root.style.setProperty(prop,value);
else root.style.removeProperty(prop);
});
});
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_SCRIPT,
          }}
        />
      </head>
      <body className="h-dvh">{children}</body>
    </html>
  );
}
