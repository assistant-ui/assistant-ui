import type { Metadata } from "next";
import { RecipeDemo } from "./recipe-demo";

export const metadata: Metadata = {
  title: "variants demo",
  robots: { index: false, follow: false },
};

// The site root disables overscroll chaining, which inside this frame would
// keep a wheel at the end of the demo from scrolling the page around it.
const FRAME_ROOT_CSS = "html{overscroll-behavior-y:auto;overflow-y:auto}";

export default function VariantsDemoPage() {
  return (
    <>
      <style>{FRAME_ROOT_CSS}</style>
      <RecipeDemo />
    </>
  );
}
