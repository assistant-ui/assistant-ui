import "./globals.css";

import { cn } from "@/lib/utils";
import { Montserrat } from "next/font/google";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

const montserrat = Montserrat({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MyRuntimeProvider>
      <html lang="en">
        <body className={cn(montserrat.className, "h-dvh")}>
          {children}
        </body>
      </html>
    </MyRuntimeProvider>
  );
}
