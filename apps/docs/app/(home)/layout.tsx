import type { ReactNode } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { HomeAssistant } from "@/components/home/home-assistant";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <HomeAssistant>
      <Header />
      {children}
      <Footer />
    </HomeAssistant>
  );
}
