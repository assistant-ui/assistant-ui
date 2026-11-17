import {
  type AccountsFetchOptions,
  AccountsRequestError,
  accountsEndpoint,
} from "aui-auth";

/** One of the viewer's organizations, as the accounts organization API lists it. */
export type AccountsOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
};

/**
 * The organizations the token's user belongs to. aui-auth 0.1 dropped its
 * organization client because web apps read the token's `orgs` claim, but
 * that claim holds at most twenty and no names, so the CLI reads the full
 * list from accounts, as the Cloud dashboard does.
 */
export const fetchOrganizations = async (
  options: AccountsFetchOptions,
  accessToken: string,
): Promise<AccountsOrganization[]> => {
  const response = await (options.fetch ?? fetch)(
    accountsEndpoint(options.issuer, "/api/oidc/organizations"),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    },
  );
  if (!response.ok)
    throw new AccountsRequestError(
      `Failed to load organizations: ${response.status}`,
      response.status,
    );
  let organizations: unknown;
  try {
    organizations = await response.json();
  } catch {
    throw new AccountsRequestError("Accounts returned no organizations", 502);
  }
  if (!Array.isArray(organizations) || !organizations.every(isOrganization))
    throw new AccountsRequestError("Accounts returned no organizations", 502);
  return organizations;
};

const isOrganization = (value: unknown): value is AccountsOrganization => {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (["id", "slug", "name", "role"] as const).every(
    (key) => typeof row[key] === "string" && row[key] !== "",
  );
};
