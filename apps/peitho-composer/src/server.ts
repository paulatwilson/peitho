import {
  ChordSeqAIGenerator,
  MagentaPulsePlanner,
  type ChordGenRequest,
  type PulseRequest,
} from "@peitho/pulse";

const port = Number(process.env.PORT ?? 3000);
const root = new URL("../public/", import.meta.url);
const composerEngineBrowserEntry = new URL("./composer-engine.ts", import.meta.url);

const pulsePlanner = new MagentaPulsePlanner();
const chordGenerator = new ChordSeqAIGenerator();

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function contentType(pathname: string): string {
  const match = pathname.match(/\.[^.]+$/);
  return (match && contentTypes[match[0]]) || "application/octet-stream";
}

function resolvePath(pathname: string): URL {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  return new URL(`.${cleanPath}`, root);
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/pulse/chords" && req.method === "POST") {
      let body: ChordGenRequest;
      try {
        body = await req.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
      try {
        const result = await chordGenerator.generate(body);
        return Response.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === "/pulse/generate" && req.method === "POST") {
      let body: PulseRequest;
      try {
        body = await req.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
      try {
        const pattern = await pulsePlanner.generate(body);
        return new Response(JSON.stringify(pattern), {
          headers: { "content-type": "application/json" },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (url.pathname === "/composer-engine.js") {
      const result = await Bun.build({
        entrypoints: [composerEngineBrowserEntry.pathname],
        target: "browser",
        format: "iife",
        minify: false,
      });

      if (!result.success || !result.outputs[0]) {
        return new Response("Failed to build Composer engine bundle", { status: 500 });
      }

      return new Response(await result.outputs[0].text(), {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const fileUrl = resolvePath(decodeURIComponent(url.pathname));
    const file = Bun.file(fileUrl);

    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(file, {
      headers: {
        "content-type": contentType(fileUrl.pathname),
      },
    });
  },
});

console.log(`Peitho-Composer dev server listening on http://localhost:${port}`);
