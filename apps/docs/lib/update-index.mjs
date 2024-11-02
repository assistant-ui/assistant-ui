import { TrieveSDK } from "trieve-ts-sdk";
import { sync } from "trieve-fumadocs-adapter/search/sync";
import * as fs from "node:fs";
import { env } from "node:process";
import "dotenv/config";

let trieve = new TrieveSDK({
  apiKey: env["TRIEVE_ADMIN_API_KEY"],
  datasetId: env["TRIEVE_DATASET_ID"],
});

const content = fs.readFileSync(".next/server/app/static.json.body");

const pages = JSON.parse(content.toString());

sync(trieve, pages);
