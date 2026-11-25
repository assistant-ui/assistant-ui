import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LibraryCategory } from "@/components/library/library-category";
import {
  LIBRARY_CATEGORY_IDS,
  getLibraryCategory,
  isLibraryCategoryId,
} from "@/lib/library/catalog";

export const generateStaticParams = () =>
  LIBRARY_CATEGORY_IDS.map((category) => ({ category }));

export async function generateMetadata(
  props: PageProps<"/library/[category]">,
): Promise<Metadata> {
  const { category } = await props.params;
  if (!isLibraryCategoryId(category)) return {};
  const { label, description } = getLibraryCategory(category);
  return { title: label, description };
}

export default async function LibraryCategoryPage(
  props: PageProps<"/library/[category]">,
) {
  const { category } = await props.params;
  if (!isLibraryCategoryId(category)) notFound();
  return <LibraryCategory category={category} />;
}
