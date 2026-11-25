import { Suspense } from "react";
import type { Metadata } from "next";
import { ThemeBuilder } from "@/components/library/theme-builder";

const description =
  "Choose a preset's colors, fonts, and component settings, then copy the command that applies it.";

export const metadata: Metadata = {
  title: "New theme",
  description,
};

/** Reads which theme the address asks to start from. */
async function Builder({
  searchParams,
}: Pick<PageProps<"/library/themes/new">, "searchParams">) {
  const { from } = await searchParams;
  const theme = typeof from === "string" ? from : undefined;
  return <ThemeBuilder key={theme} description={description} from={theme} />;
}

export default function Page(props: PageProps<"/library/themes/new">) {
  return (
    <Suspense fallback={null}>
      <Builder searchParams={props.searchParams} />
    </Suspense>
  );
}
