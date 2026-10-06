/// <reference types="astro/client" />
interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
}
declare module "cloudflare:workers" {
  export const env: Env;
}
