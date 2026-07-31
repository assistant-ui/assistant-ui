import { notFound } from "next/navigation";

type StageRoute = {
  POST: (request: Request) => Promise<Response>;
};

const stageRoutes: Record<string, () => Promise<StageRoute>> = {
  S1: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S1/project/app/api/chat/route"),
  S2: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S2/project/app/api/chat/route"),
  S3: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S3/project/app/api/chat/route"),
  S4: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S4/project/app/api/chat/route"),
  S5: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S5/project/app/api/chat/route"),
  S6: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S6/project/app/api/chat/route"),
  S7: () =>
    import("@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S7/project/app/api/chat/route"),
};

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stageId: string }> },
) {
  const { stageId } = await params;
  const loadRoute = stageRoutes[stageId];
  if (!loadRoute) notFound();
  const route = await loadRoute();
  return route.POST(request);
}
