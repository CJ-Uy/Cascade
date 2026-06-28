import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
  try {
    const { hostname } = new URL(request.url);
    const hasSmokeHeader = request.headers.get("x-cf-smoke") === "phase1";

    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hasSmokeHeader) {
      return new Response(null, { status: 404 });
    }

    const { env } = getCloudflareContext();
    const key = `phase1-smoke/${crypto.randomUUID()}.txt`;
    const value = new Date().toISOString();

    await env.CF_SMOKE_DB.prepare(
      "CREATE TABLE IF NOT EXISTS phase1_smoke (id TEXT PRIMARY KEY, created_at TEXT NOT NULL)",
    ).run();
    await env.CF_SMOKE_DB.prepare(
      "INSERT INTO phase1_smoke (id, created_at) VALUES (?, ?)",
    )
      .bind(key, value)
      .run();

    await env.CF_SMOKE_BUCKET.put(key, value);
    const object = await env.CF_SMOKE_BUCKET.get(key);
    await env.CF_SMOKE_BUCKET.delete(key);

    return Response.json({
      ok: true,
      d1: "write-ok",
      r2: object ? await object.text() : null,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
