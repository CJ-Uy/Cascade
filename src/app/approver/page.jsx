"use client";

import { DashboardHeader } from "@/components/dashboardHeader";
import { fetchRoleAndGetRedirectPath } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export default function Approver() {
	const router = useRouter();
	const [shouldRenderPageContent, setShouldRenderPageContent] = useState(false);
	const { data: session, isPending: isSessionPending } = useSession();
	const [myRequests, setMyRequests] = useState([]);

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
	}, [router]);

	useEffect(() => {
		if (!shouldRenderPageContent || isSessionPending || !session?.user?.id) {
			return; // Don't fetch if not ready or no user ID
		}

		async function fetchData() {
			try {
				const response = await fetch("/api/requisition/getAll/asApprover", {
					method: "POST",
					body: JSON.stringify({ id: session?.user?.id }),
				});
				if (!response.ok) {
					console.error("API request failed:", response.status);
					return;
				}
				const data = await response.json();
				setMyRequests(data);
			} catch (err) {
				console.error("Failed to fetch data:", err);
			}
		}

		fetchData(); // Initial fetch
	}, [shouldRenderPageContent, session, isSessionPending]);

	if (isSessionPending) {
		return <p>Loading session...</p>; // Or a loader component
	}

	if (!shouldRenderPageContent) {
		return <p>Verifying access...</p>; // Or null, or a loader
	}

	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Dashboard" />
				<div className="flex w-[80%] flex-col">
					<pre>{JSON.stringify(myRequests, null, 2)}</pre>
				</div>
			</div>
		</>
	);
}
