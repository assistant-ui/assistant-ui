import { createFileRoute } from "@tanstack/react-router";
import { DocRoute, routeLoader } from "../lib/doc-page";

export const Route = createFileRoute("/elements/$")({
  loader: ({ params }) =>
    routeLoader("elements", (params as { _splat?: string })._splat),
  component: () => <DocRoute data={Route.useLoaderData()} />,
});
