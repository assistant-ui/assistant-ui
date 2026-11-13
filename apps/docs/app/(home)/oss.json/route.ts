import { unstable_cache } from "@farm.js/core/cache";
import { BASE_URL } from "@/lib/constants";
import {
  OSS_CATEGORIES,
  OSS_PROJECTS,
  ossAbsoluteUrl,
  ossNpmUrl,
  ossPrimaryUrl,
  ossPypiUrl,
  ossRepoUrl,
} from "@/lib/oss";

const getBody = unstable_cache(
  async function getBody() {
    const body = {
      organization: "assistant-ui",
      categories: OSS_CATEGORIES,
      projects: OSS_PROJECTS.map((project) => ({
        ...project,
        url: ossAbsoluteUrl(ossPrimaryUrl(project), BASE_URL),
        repoUrl: ossRepoUrl(project),
        ...(project.docs
          ? { docs: ossAbsoluteUrl(project.docs, BASE_URL) }
          : {}),
        ...(project.site
          ? { site: ossAbsoluteUrl(project.site, BASE_URL) }
          : {}),
        ...(project.npm ? { npmUrl: ossNpmUrl(project.npm) } : {}),
        ...(project.pypi ? { pypiUrl: ossPypiUrl(project.pypi) } : {}),
      })),
    };

    return body;
  },
  ["app/(home)/oss.json/route.ts#getBody"],
  { revalidate: false },
);

export async function GET() {
  return Response.json(await getBody(), {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
