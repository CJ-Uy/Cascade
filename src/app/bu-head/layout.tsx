"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BuHeadSideBar } from "@/components/buHead/sidebar";

import { LoadingScreen } from "@/components/utils/loading-screen";

import { fetchRoleAndGetRedirectPath } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


export default function Layout({ children }: { children: React.ReactNode }) {
	// This state tracks if the page content is ready to be shown.
	const [shouldRenderPageContent, setShouldRenderPageContent] = useState(false);
	// This new state tracks if the initial authentication check has been completed.
	const [isAuthChecked, setIsAuthChecked] = useState(false);
	const router = useRouter();

	useEffect(() => {
		// If the check has already passed, do nothing on subsequent navigations.
		if (isAuthChecked) {
			return;
		}

		async function checkAuthAndSetRender() {
			const targetPath = await fetchRoleAndGetRedirectPath();
			const currentPath = window.location.pathname;

			if (!currentPath.startsWith(targetPath)) {
				// If the user is in the wrong place, redirect them.
				// The loading screen will show until the new page loads.
				router.push(targetPath);
			} else {
				setShouldRenderPageContent(true);
				setIsAuthChecked(true);
			}
		}

		checkAuthAndSetRender();
		// We add isAuthChecked to the dependency array as a best practice.
	}, [router, isAuthChecked]);

	return (
		
		<SidebarProvider>
			<BuHeadSideBar />
			<main className="flex-grow">
				<SidebarTrigger />				
				{shouldRenderPageContent ? children : null}
				<LoadingScreen isLoading={!isAuthChecked} />
			</main>
		</SidebarProvider>
	);
}
