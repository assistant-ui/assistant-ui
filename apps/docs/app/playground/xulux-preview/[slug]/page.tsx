import { notFound } from "next/navigation";
import { ExamplePreview } from "@/components/xulux/examples/ExamplePreview";
import { getXuluxExamplePreview } from "@/lib/xulux/examples-catalog";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const preview = getXuluxExamplePreview(slug);
  if (!preview) notFound();

  return <ExamplePreview preview={preview} />;
}
