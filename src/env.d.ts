/// <reference types="astro/client" />
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}
declare module "cloudflare:workers" {
  export const env: Env;
}
