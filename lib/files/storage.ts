import { getCloudflareContext } from "@opennextjs/cloudflare";

type UploadOptions = {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
};

export async function uploadStorageObject(
  bucket: string,
  objectPath: string,
  file: File,
  options?: UploadOptions,
) {
  const key = storageKey(bucket, objectPath);
  await getCloudflareContext().env.AGILA_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      cacheControl: options?.cacheControl,
      contentType: options?.contentType || file.type,
    },
  });
  return { data: { path: objectPath }, error: null };
}

export async function removeStorageObjects(
  bucket: string,
  objectPaths: string[],
) {
  await Promise.all(
    objectPaths.map((objectPath) =>
      getCloudflareContext().env.AGILA_BUCKET.delete(
        storageKey(bucket, objectPath),
      ),
    ),
  );
  return { data: objectPaths.map((name) => ({ name })), error: null };
}

export async function getStoragePublicUrl(bucket: string, objectPath: string) {
  return `/api/files/${encodeURIComponent(bucket)}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function storageKey(bucket: string, objectPath: string) {
  return `${bucket}/${objectPath}`;
}
