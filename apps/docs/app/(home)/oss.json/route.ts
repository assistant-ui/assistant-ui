import { BASE_URL } from "@/lib/constants";
import {
  OSS_CATEGORIES,
  OSS_PROJECTS,
  ossPrimaryUrl,
  ossRepoUrl,
} from "@/lib/oss";

export const revalidate = false;

const absolute = (url: string) =>
  url.startsWith("http") ? url : BASE_URL + url;

export function GET() {
  const body = {
    organization: "assistant-ui",
    categories: OSS_CATEGORIES,
    projects: OSS_PROJECTS.map((project) => ({
      ...project,
      url: absolute(ossPrimaryUrl(project)),
      repoUrl: ossRepoUrl(project),
      ...(project.docs ? { docs: absolute(project.docs) } : {}),
      ...(project.site ? { site: absolute(project.site) } : {}),
    })),
  };

  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
