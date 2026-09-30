import "server-only";

import type { AccountsFetchOptions } from "aui-auth";
import { fetchOrganizations, fetchProjects } from "aui-auth/accounts";

export type CloudProject = {
  id: string;
  name: string;
  organization: string;
  frontendUrl: string;
};

/** The frontend host a project id answers on: `proj_0ltyjcuaxpv1` is `https://proj-0ltyjcuaxpv1.assistant-api.com`, as the cloud dashboard derives it. */
export const frontendApiUrl = (projectId: string) =>
  `https://${projectId.replace("_", "-")}.assistant-api.com`;

export async function listCloudProjects(
  accessToken: string,
  options: AccountsFetchOptions,
): Promise<CloudProject[]> {
  const organizations = await fetchOrganizations(options, accessToken);
  const listed = await Promise.all(
    organizations.map(async (organization) =>
      (await fetchProjects(options, accessToken, { id: organization.id })).map(
        (project) => ({
          updatedAt: project.updatedAt.getTime(),
          entry: {
            id: project.id,
            name: project.name,
            organization: organization.name,
            frontendUrl: frontendApiUrl(project.id),
          },
        }),
      ),
    ),
  );
  return listed
    .flat()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ entry }) => entry);
}
