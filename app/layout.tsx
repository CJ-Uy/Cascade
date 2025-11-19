import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

import { Toaster } from "sonner";
import { SessionProvider } from "@/app/contexts/SessionProvider";
import { getUserAuthContext } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Cascade",
  description: "Digital Mass Document Approval and Review System",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

// Good practice for layouts dealing with auth: ensures session is fresh on every request.
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authContext = await getUserAuthContext();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider initialAuthContext={authContext}>
            <Toaster position="top-center" richColors />
            <main>{children}</main>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
