import type { Metadata } from "next";
import { Images } from "./components/images";

export const metadata: Metadata = { title: "Images" };

export default function Page() {
  return <Images />;
}
