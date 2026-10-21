import { cacheLife } from "next/cache";
import {
  API_CATALOG_CONTENT_TYPE,
  buildApiCatalog,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

async function getCatalog() {
  "use cache";
  cacheLife("max");
  return buildApiCatalog();
}

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
