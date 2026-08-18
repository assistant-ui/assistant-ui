export const AI_BUILDER_RETURN_PATH = "/playground?mode=agent";

export function createAiBuilderReturnPath(
  searchParams: URLSearchParams,
): string {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set("mode", "agent");
  return `/playground?${nextSearchParams}`;
}

export function createSignInUrl(requestUrl: string): URL {
  const signInUrl = new URL("/sign-in", requestUrl);
  signInUrl.searchParams.set("redirect_url", requestUrl);
  return signInUrl;
}
