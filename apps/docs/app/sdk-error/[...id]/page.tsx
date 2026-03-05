import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ERROR_DOCS } from "../errors";
import { SdkErrorContent } from "./sdk-error-content";

type Props = {
  params: Promise<{ id: string[] }>;
  searchParams: Promise<{ info?: string }>;
};

export default async function SdkErrorPage(props: Props) {
  const { id } = await props.params;
  const { info: infoParam } = await props.searchParams;

  const errorId = id.join("/");
  const errorDoc = ERROR_DOCS[errorId];

  if (!errorDoc) {
    notFound();
  }

  let errorInfo: Record<string, unknown> | undefined;
  if (infoParam) {
    try {
      errorInfo = JSON.parse(atob(infoParam));
    } catch {
      // ignore malformed info
    }
  }

  return <SdkErrorContent errorId={errorId} doc={errorDoc} info={errorInfo} />;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const errorId = id.join("/");
  const errorDoc = ERROR_DOCS[errorId];

  if (!errorDoc) {
    return { title: "Unknown Error" };
  }

  return {
    title: `${errorDoc.title} — assistant-ui SDK Error`,
    description: errorDoc.description,
  };
}

export function generateStaticParams() {
  return Object.keys(ERROR_DOCS).map((id) => ({
    id: id.split("/"),
  }));
}
