import { BASE_URL } from "@/lib/constants";
import { SETUP_SNIPPETS } from "@/lib/home-setup";
import { cacheLife } from "next/cache";
import { HomeDemo } from "@/components/pages/home/demo";
import { Hero } from "@/components/pages/home/hero";
import { LibraryBody } from "@/components/pages/home/library-body";
import { PageFrame } from "@/components/shared/page-frame";
import { getRepo } from "@/lib/github";
import { highlightElementSource } from "@/lib/element-source";
import { getWeeklyDownloads } from "@/lib/npm";

export const metadata = {
  alternates: { canonical: "/", types: { "text/markdown": "/index.md" } },
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "assistant-ui",
  legalName: "AgentbaseAI Inc.",
  url: BASE_URL,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    url: `${BASE_URL}/contact-sales`,
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "580 Howard St, Suite 201",
    addressLocality: "San Francisco",
    addressRegion: "CA",
    postalCode: "94105",
    addressCountry: "US",
  },
};

function markChangedLines(html: string, lines: readonly number[]): string {
  let lineNumber = 0;
  return html.replaceAll('<span class="line">', () => {
    lineNumber += 1;
    return lines.includes(lineNumber)
      ? '<span class="line line-hot">'
      : '<span class="line">';
  });
}

async function getHomeStats() {
  "use cache";
  cacheLife("hours");
  return Promise.all([getRepo(), getWeeklyDownloads()]);
}

export default async function HomePage() {
  const [[repo, downloads], setupHtml] = await Promise.all([
    getHomeStats(),
    Promise.all(
      SETUP_SNIPPETS.map((snippet) =>
        highlightElementSource(snippet.code, "tsx"),
      ),
    ),
  ]);

  const setupTabs = SETUP_SNIPPETS.map((snippet, index) => ({
    id: snippet.id,
    label: snippet.label,
    caption: snippet.caption,
    docs: snippet.docs,
    html: markChangedLines(setupHtml[index]!, snippet.changed),
  }));

  return (
    <PageFrame pad="heroBody" className="relative z-2 flex flex-col">
      <link
        rel="service-desc"
        href="/openapi.json"
        type="application/vnd.oai.openapi+json"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization).replaceAll("<", "\\u003c"),
        }}
      />
      <div className="flex flex-col gap-10 md:gap-16">
        <Hero stars={repo?.stars ?? null} downloads={downloads} />
        <HomeDemo />
      </div>
      <LibraryBody setupTabs={setupTabs} />
    </PageFrame>
  );
}
