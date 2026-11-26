import type { Metadata } from "next";
import { Images } from "./images";

export const metadata: Metadata = { title: "Images" };

export default function Page() {
  return <Images />;
}
