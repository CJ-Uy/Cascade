import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
	title: "Cascade",
	description: "Digital Mass Document Approval and Review System",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
			<Toaster position="top-center" richColors />
		</html>
	);
}
