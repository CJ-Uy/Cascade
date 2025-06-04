"use client";

import { fetchRoleAndGetRedirectPath } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

import { DashboardHeader } from "@/components/dashboardHeader";
import { RequisitionTable } from "@/components/dataTable/requisition/requisitionTable";

export default function Initiator() {
	const router = useRouter();
	const { data: session, isPending: isSessionPending } = useSession();
	const [shouldRenderPageContent, setShouldRenderPageContent] = useState(false);
	const [myRequests, setMyRequests] = useState([]);

	useEffect(() => {
		async function checkAuthAndSetRender() {
			const targetPath = await fetchRoleAndGetRedirectPath();
			const currentPath = window.location.pathname;
			if (targetPath !== currentPath) {
				router.push(targetPath);
			} else {
				setShouldRenderPageContent(true);
			}
		}
		checkAuthAndSetRender();
	}, [router]);

	useEffect(() => {
		if (!shouldRenderPageContent || isSessionPending || !session?.user?.id) {
			return; // Don't fetch if not ready or no user ID
		}

		async function fetchData() {
			try {
				const response = await fetch("/api/requisition/getAll/asInitiator", {
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

		// Uncomment the following lines if you want to poll for updates
		// Low key a bit dangerous because the request to loop is cached in the browser so changing the fetch function will not update the site behavior unless hard refresh iwht ctrl shift r
		// const intervalId = setInterval(fetchData, 2000);
		// return () => {
		// 	clearInterval(intervalId);
		// };

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
					<RequisitionTable data={myRequests} />
				</div>
			</div>
		</>
	);
}
