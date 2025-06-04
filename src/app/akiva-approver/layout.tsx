"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AkivaApproverSideBar } from "@/components/akivaApprover/sidebar";

import { fetchRoleAndGetRedirectPath } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function Layout({ children }: { children: React.ReactNode }) {
	const [shouldRenderPageContent, setShouldRenderPageContent] = useState(false);
	const router = useRouter();
		
	useEffect(() => {
		async function checkAuthAndSetRender() {
			const targetPath = await fetchRoleAndGetRedirectPath();
			const currentPath = window.location.pathname;
			if (!currentPath.startsWith(targetPath)) {
				router.push(targetPath);
			} else {
				setShouldRenderPageContent(true);
			}
		}
		checkAuthAndSetRender();
	}, [router]);

	if (!shouldRenderPageContent) {
		return <LoadingScreen />
	}

	return (
		<SidebarProvider>
			<AkivaApproverSideBar />
			<main className="flex-grow">
				<SidebarTrigger />
				{children}
			</main>
		</SidebarProvider>
	);
}
