import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache de páginas: as páginas que leem o banco são montadas a cada acesso (force-dynamic).
export default defineCloudflareConfig({});
