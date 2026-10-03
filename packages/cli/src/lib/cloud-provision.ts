import { randomUUID } from "node:crypto";
import path from "node:path";
import { readOptionalFile, writeCloudFile } from "./cloud-config";
import { validateCloudUrl } from "./cloud-auth";

export type CloudProvisionRequest = {
  org_id: string;
  project_id: string;
  harness_name: string;
  backend_urls: string[];
  allow_localhost: boolean;
  idempotency_key: string;
  access_code?: string;
};

export type CloudProvisionResult = {
  project_id: string;
  workspace_id: string;
  harness_id: string;
  harness_origin: string;
  api_key: string;
  api_origin: string;
};

export const resolveProvisionRequest = async (
  directory: string,
  input: Omit<CloudProvisionRequest, "idempotency_key" | "access_code">,
  accessCode?: string,
): Promise<CloudProvisionRequest> => {
  const file = path.join(directory, ".assistant-ui", "provision.json");
  const previous = await readOptionalFile(file);
  let request: CloudProvisionRequest;
  if (previous) {
    request = JSON.parse(previous) as CloudProvisionRequest;
    const { idempotency_key: _key, ...savedInput } = request;
    if (JSON.stringify(savedInput) !== JSON.stringify(input)) {
      throw new Error(
        "This directory has a pending setup for another project or backend. Resume that setup or use a new directory.",
      );
    }
  } else {
    request = { ...input, idempotency_key: randomUUID() };
    await writeCloudFile(file, `${JSON.stringify(request, null, 2)}\n`, {
      exclusive: true,
    });
  }
  return { ...request, ...(accessCode ? { access_code: accessCode } : {}) };
};

export const provisionCloudHarness = async (
  managementUrl: string,
  accessToken: string,
  request: CloudProvisionRequest,
): Promise<CloudProvisionResult> => {
  const response = await fetch(
    `${validateCloudUrl(managementUrl)}/api/cli/provision`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    const detail = body?.message ?? body?.error ?? response.statusText;
    throw new Error(`Cloud setup failed (${response.status}): ${detail}`);
  }
  const result = (await response.json()) as CloudProvisionResult;
  if (
    !result ||
    [
      result.api_key,
      result.harness_id,
      result.workspace_id,
      result.harness_origin,
      result.api_origin,
    ].some((value) => typeof value !== "string" || value.length === 0) ||
    result.project_id !== request.project_id
  ) {
    throw new Error(
      "Cloud returned an incomplete setup response. Rerun the same command to resume safely.",
    );
  }
  return result;
};
