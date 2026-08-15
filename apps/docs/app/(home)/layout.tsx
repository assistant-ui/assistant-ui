import type { ReactNode } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { HomeAssistant } from "@/components/home/home-assistant";
import { getRepo } from "@/lib/github";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}): Promise<React.ReactElement> {
  const repo = await getRepo();

  return (
    <HomeAssistant>
      <Header stars={repo?.stars ?? null} />
      {children}
      <Footer />
    </HomeAssistant>
  );
}
