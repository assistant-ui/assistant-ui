import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";
import { HomepageHiringBanner } from "@/components/home/HomepageHiringBanner";
import { Footer } from "@/components/shared/footer";

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
