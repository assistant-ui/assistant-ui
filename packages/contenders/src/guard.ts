import { LOG_PREFIX } from "./name";

const isTruthy = (value: string | undefined) =>
  value !== undefined && ["1", "true", "yes"].includes(value.toLowerCase());

// Each `process.env.X` stays a literal member access so bundlers can inline it;
// the try blocks cover runtimes where `process` is not defined.
const isProductionBuild = (): boolean => {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
};

const isAllowedByEnv = (): boolean => {
  try {
    if (isTruthy(process.env.CONTENDERS_ALLOW_IN_PRODUCTION)) return true;
  } catch {}
  try {
    if (isTruthy(process.env.NEXT_PUBLIC_CONTENDERS_ALLOW_IN_PRODUCTION))
      return true;
  } catch {}
  return false;
};

export const isDev = (): boolean => !isProductionBuild();

export const productionError = (group: string): Error =>
  new Error(
    `${LOG_PREFIX} <Variants id="${group}"> rendered in a production build. ` +
      `Pick one variant, replace the <Variants> block with that <Variant>'s children, and remove the wrapper. ` +
      `To keep variants in a preview deployment, set CONTENDERS_ALLOW_IN_PRODUCTION=1 ` +
      `(NEXT_PUBLIC_CONTENDERS_ALLOW_IN_PRODUCTION=1 for Next.js client bundles) or pass allowInProduction.`,
  );

export const assertAllowed = (
  group: string,
  allowInProduction: boolean | undefined,
): void => {
  if (!isProductionBuild() || allowInProduction || isAllowedByEnv()) return;
  throw productionError(group);
};
