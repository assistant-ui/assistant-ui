import { Hero } from "@/components/pages/home/hero";
import { LibraryBody } from "@/components/pages/home/library-body";
import { ThreadSpecimen } from "@/components/pages/home/thread-specimen";
import { PageFrame } from "@/components/shared/page-frame";
import { getRepo } from "@/lib/github";
import { getWeeklyDownloads } from "@/lib/npm";

export default async function HomePage() {
  const [repo, downloads] = await Promise.all([
    getRepo(),
    getWeeklyDownloads(),
  ]);

  return (
    <PageFrame pad="heroBody" className="relative z-2 flex flex-col">
      <div className="flex flex-col gap-10 md:gap-16">
        <Hero stars={repo?.stars ?? null} downloads={downloads} />
        <ThreadSpecimen />
      </div>
      <LibraryBody />
    </PageFrame>
  );
}
