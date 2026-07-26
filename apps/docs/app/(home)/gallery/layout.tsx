import type { ReactNode } from "react";
import { galleryStagingCss } from "@/components/gallery/gallery-staging";

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="aui-gallery">
      <style>{galleryStagingCss}</style>
      {children}
    </div>
  );
}
