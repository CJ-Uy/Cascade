import { getPresignedUrl } from "@/lib/minio";

// Receive an array of object keys then return an array of their public key counterparts
export async function POST(req) {
  try {
    const { keys } = await req.json();

    if (!Array.isArray(keys) || keys.length === 0) {
      return Response.json({ error: "No keys provided" }, { status: 400 });
    }

    // Generate presigned URLs in the same order as keys
    const urls = await Promise.all(keys.map((key) => getPresignedUrl(key)));

    return Response.json({ urls });
  } catch (err) {
    return Response.json(
      { error: "Failed to generate presigned URLs", details: err.message },
      { status: 500 },
    );
  }
}
