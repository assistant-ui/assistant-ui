import { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "../docs/layout.config";
import { HomepageHiringBanner } from "@/components/home/HomepageHiringBanner";
import { Footer } from "@/components/common";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <HomeLayout {...baseOptions}>
      <HomepageHiringBanner />
      {children}
      <Footer />
    </HomeLayout>
  );
}
