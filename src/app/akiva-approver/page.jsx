"use client";

import { DashboardHeader } from "@/components/dashboardHeader";
import { fetchRoleAndGetRedirectPath } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AkivaApprover() {
	const router = useRouter();
	const [shouldRenderPageContent, setShouldRenderPageContent] = useState(false);
	useEffect(() => {
		async function redirectToPath() {
			const targetPath = await fetchRoleAndGetRedirectPath();
			const currentPath = window.location.pathname;
			if (targetPath !== currentPath) {
				router.push(targetPath);
			} else {
				setShouldRenderPageContent(true);
			}
		}
		redirectToPath();
		
	}, [router])
	
	if (!shouldRenderPageContent) {
		return null;
	}
	
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Dashboard" />
				<div className="flex w-[80%] flex-col"></div>
			</div>
		</>
	);
}
