"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function Home() {
	const [file, setFile] = useState(null);
	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setUrl("");
		if (!file) {
			setError("Please select a file to upload.");
			return;
		}

		setLoading(true);
		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			const data = await res.json();
			if (res.ok && data.url) {
				setUrl(data.url);
			} else {
				setError(data.error || "Upload failed.");
			}
		} catch (err) {
			setError("An error occurred during upload.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
				<h1 className="mb-6 text-center text-2xl font-bold">Upload a File</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Input
						type="file"
						onChange={(e) => setFile(e.target.files[0])}
						accept="image/*,application/pdf"
						className="w-full"
					/>
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? (
							<span className="flex items-center justify-center">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Uploading...
							</span>
						) : (
							"Upload"
						)}
					</Button>
				</form>

				{error && (
					<Alert variant="destructive" className="mt-6">
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{url && (
					<Alert className="mt-6">
						<CheckCircle2 className="h-5 w-5 text-green-500" />
						<AlertTitle>Success!</AlertTitle>
						<AlertDescription>
							File uploaded:{" "}
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								className="break-all text-blue-600 underline"
							>
								{url}
							</a>
						</AlertDescription>
					</Alert>
				)}
			</div>
		</div>
	);
}
