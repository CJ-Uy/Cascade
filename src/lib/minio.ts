import { Client } from "minio";

const url = new URL(process.env.MINIO_API_URL!);

export const minioClient = new Client({
	endPoint: url.hostname,
	port: url.port ? parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80,
	useSSL: process.env.MINIO_USE_SSL === "true",
	accessKey: process.env.MINIO_ADMIN_USER,
	secretKey: process.env.MINIO_ADMIN_PASSWORD,
});

/**
 * Generate a presigned URL for a given object key.
 * @param key The object key (filename) in the bucket.
 * @param expirySeconds How long the URL should be valid (default: 1 hour).
 * @returns Promise<string> The presigned URL.
 */
export async function getPresignedUrl(
	key: string,
	expirySeconds: number = parseInt(process.env.MINIO_PUBLIC_URL_EXPIRY_SECONDS || "3600", 10),
): Promise<string> {
	return await minioClient.presignedGetObject(process.env.MINIO_BUCKET!, key, expirySeconds);
}
