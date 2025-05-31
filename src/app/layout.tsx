import type { Metadata } from "next";
import "./globals.css";

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
		</html>
	);
}
