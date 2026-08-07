import {
  API_CATALOG_CONTENT_TYPE,
  buildApiCatalog,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

export const revalidate = false;

export function GET() {
  return createJsonDiscoveryResponse(buildApiCatalog(), {
    contentType: API_CATALOG_CONTENT_TYPE,
  });
}

export function HEAD() {
  return createJsonDiscoveryResponse(buildApiCatalog(), {
    contentType: API_CATALOG_CONTENT_TYPE,
    head: true,
  });
}
