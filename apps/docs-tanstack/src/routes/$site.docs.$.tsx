import { createFileRoute } from "@tanstack/react-router";
import { DocRoute, routeLoader } from "../lib/doc-page";

export const Route = createFileRoute("/$site/docs/$")({
  loader: ({ params }) =>
    routeLoader(
      `site:${(params as { site: string }).site}`,
      (params as { _splat?: string })._splat,
    ),
  component: () => <DocRoute data={Route.useLoaderData()} />,
});
