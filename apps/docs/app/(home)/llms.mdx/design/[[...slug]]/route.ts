import {
  getDesignMarkdownResponse,
  getDesignMarkdownStaticParams,
} from "@/lib/design-markdown";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return getDesignMarkdownResponse(slug, "base");
}

export function generateStaticParams() {
  return getDesignMarkdownStaticParams();
}
