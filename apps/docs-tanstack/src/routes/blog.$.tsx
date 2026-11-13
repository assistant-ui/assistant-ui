import { createFileRoute } from "@tanstack/react-router";
import { DocRoute, routeLoader } from "../lib/doc-page";

export const Route = createFileRoute("/blog/$")({
  loader: ({ params }) =>
    routeLoader("blog", (params as { _splat?: string })._splat),
  component: () => <DocRoute data={Route.useLoaderData()} />,
});
