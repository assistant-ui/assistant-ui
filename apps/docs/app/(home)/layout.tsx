import type { ReactNode } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
