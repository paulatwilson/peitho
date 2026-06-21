const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function contentType(pathname: string): string {
  const extension = pathname.match(/\.[^.]+$/)?.[0];
  return extension ? CONTENT_TYPES[extension] ?? "application/octet-stream" : "application/octet-stream";
}

export function createStaticAssets(publicRoot: URL, composerEngineEntry: URL) {
  return async function staticAssets(pathname: string): Promise<Response> {
    if (pathname === "/composer-engine.js") {
      const result = await Bun.build({
        entrypoints: [composerEngineEntry.pathname],
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

    const cleanPath = pathname === "/" ? "/index.html" : pathname;
    const fileUrl = new URL(`.${decodeURIComponent(cleanPath)}`, publicRoot);
    const file = Bun.file(fileUrl);

    if (!(await file.exists())) return new Response("Not found", { status: 404 });

    return new Response(file, {
      headers: { "content-type": contentType(fileUrl.pathname) },
    });
  };
}
