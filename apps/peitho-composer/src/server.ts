const port = Number(process.env.PORT ?? 3000);
const root = new URL("../../../", import.meta.url);

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
  const cleanPath = pathname === "/" ? "/docs/Peitho/Peitho.dc.html" : pathname;
  return new URL(`.${cleanPath}`, root);
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
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
