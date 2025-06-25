import { minioClient } from "@/lib/minio";

export async function POST(req) {
	try {
		const formData = await req.formData();
		const file = formData.get("file");

		if (!file) {
			return Response.json({ error: "No file uploaded" }, { status: 400 });
		}

		// Read file into a buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const bucket = process.env.MINIO_BUCKET;
		const objectName = `${Date.now()}_${file.name}`;

		// Upload to MinIO
		await minioClient.putObject(bucket, objectName, buffer, buffer.length, file.type);

		// Return the public URL (adjust as needed for your setup)
		const url = await minioClient.presignedGetObject(bucket, objectName, 60 * 60); // 1 hour
		return Response.json({ url });
	} catch (err) {
		console.error(err.message);
		return Response.json({ error: "Upload failed", details: err.message }, { status: 500 });
	}
}
