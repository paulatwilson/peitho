import { createPulseApi } from "./pulse-api";
import { createStaticAssets } from "./static-assets";

const port = Number(process.env.PORT ?? 3000);
const pulseApi = createPulseApi();
const staticAssets = createStaticAssets(
  new URL("../public/", import.meta.url),
  new URL("./composer-engine.ts", import.meta.url),
);

Bun.serve({
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    return await pulseApi(request, pathname) ?? staticAssets(pathname);
  },
});

console.log(`Peitho-Composer dev server listening on http://localhost:${port}`);
