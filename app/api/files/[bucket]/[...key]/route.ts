import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getCurrentUser } from "@/lib/auth/native";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> },
) {
  const { bucket, key } = await params;
  const user = await getCurrentUser();
  if (!user && bucket !== "public" && bucket !== "avatars") {
    return new Response("Not authenticated", { status: 401 });
  }

  const object = await getCloudflareContext().env.AGILA_BUCKET.get(
    `${bucket}/${key.join("/")}`,
  );

  if (!object) {
    return new Response(null, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "content-type":
        object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control":
        object.httpMetadata?.cacheControl || "private, max-age=3600",
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const { bucket, key } = await params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }

  await getCloudflareContext().env.AGILA_BUCKET.put(
    `${bucket}/${key.join("/")}`,
    file.stream(),
    {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
      },
    },
  );

  return Response.json({ path: key.join("/") });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; key: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const { bucket, key } = await params;
  await getCloudflareContext().env.AGILA_BUCKET.delete(
    `${bucket}/${key.join("/")}`,
  );
  return Response.json({ path: key.join("/") });
}
