import type { Metadata } from "next";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function createOgMetadata(
  title: string,
  description?: string | null,
): Pick<Metadata, "openGraph" | "twitter"> {
  const params = new URLSearchParams();
  params.set("title", title);
  if (description) {
    params.set("description", description);
  }
  const imageUrl = `/api/og?${params.toString()}`;

  return {
    openGraph: {
      title,
      description: description ?? undefined,
      type: "article",
      images: [{ url: imageUrl, ...OG_IMAGE_SIZE, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
      images: [imageUrl],
    },
  };
}
