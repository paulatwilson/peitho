export async function readJson<T>(request: Request): Promise<T | Response> {
  try {
    return await request.json() as T;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
}

export function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  return Response.json({ error: message }, { status: 500 });
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
