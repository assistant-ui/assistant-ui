import { unstable_cache } from "@farm.js/core/cache";
import {
  API_CATALOG_CONTENT_TYPE,
  buildApiCatalog,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

const getCatalog = unstable_cache(
  async function getCatalog() {
    return buildApiCatalog();
  },
  ["app/(home)/.well-known/api-catalog/route.ts#getCatalog"],
  { revalidate: false },
);

export async function GET() {
  return createJsonDiscoveryResponse(await getCatalog(), {
    contentType: API_CATALOG_CONTENT_TYPE,
  });
}

export async function HEAD() {
  return createJsonDiscoveryResponse(await getCatalog(), {
    contentType: API_CATALOG_CONTENT_TYPE,
    head: true,
  });
}
