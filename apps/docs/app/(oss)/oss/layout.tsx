import type { ReactNode } from "react";
import { Footer } from "@/components/shared/footer";
import { OssHeader } from "@/components/shared/oss-header";

export default function OssLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <OssHeader />
      {children}
      <Footer />
    </div>
  );
}
