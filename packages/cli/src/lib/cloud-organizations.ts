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
  const organizations: unknown = await response.json();
  if (!Array.isArray(organizations))
    throw new AccountsRequestError("Accounts returned no organizations", 502);
  return organizations as AccountsOrganization[];
};
