const loc = () => (typeof window === "undefined" ? undefined : window.location);
export const usePathname = () => loc()?.pathname ?? "/";
export const useSearchParams = () => new URLSearchParams(loc()?.search ?? "");
export const useParams = () => ({});
export const useRouter = () => ({
  push: (u: string) => loc()?.assign(u),
  replace: (u: string) => loc()?.replace(u),
  back: () => history.back(),
  forward: () => history.forward(),
  refresh: () => {},
  prefetch: () => {},
});
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export function notFound(): never {
  throw new Error("notFound");
}
export function redirect(u: string): never {
  throw new Error("redirect " + u);
}
export function permanentRedirect(u: string): never {
  throw new Error("redirect " + u);
}
