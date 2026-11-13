import { NextResponse } from "next/server";
import { accountsIssuer, getAccessToken } from "@/lib/accounts-auth";
import { listCloudProjects, type CloudProject } from "@/lib/cloud-projects";
import { isSetupAppRequest, setupCorsHeaders } from "@/lib/setup-origin";

export type CloudProjectsPayload = { projects: CloudProject[] };

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store", ...setupCorsHeaders(request) };
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const sameOrigin =
    fetchSite !== null
      ? fetchSite === "same-origin"
      : origin !== null && origin === new URL(request.url).origin;
  if (!sameOrigin && !isSetupAppRequest(request)) {
    return new Response(null, { status: 403, headers });
  }

  const issuer = accountsIssuer();
  if (!issuer) {
    return NextResponse.json(
      { error: "Sign-in is not configured on this deployment." },
      { status: 503, headers },
    );
  }

  const accessToken = await getAccessToken().catch(() => null);
  if (!accessToken) {
    return NextResponse.json(
      { error: "A signed-in session is required." },
      { status: 401, headers },
    );
  }

  try {
    const payload: CloudProjectsPayload = {
      projects: await listCloudProjects(accessToken, { issuer }),
    };
    return NextResponse.json(payload, { headers });
  } catch {
    return NextResponse.json(
      { error: "Accounts could not list the projects." },
      { status: 502, headers },
    );
  }
}
