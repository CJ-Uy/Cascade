"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

import { DashboardHeader } from "@/components/dashboardHeader";
import { RequisitionTable } from "@/components/dataTable/requisition/requisitionTable";

export default function Approver() {
	const { data: session, isPending: isSessionPending } = useSession();
	const [myRequests, setMyRequests] = useState([]);

	useEffect(() => {
		if (isSessionPending || !session?.user?.id) {
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

	}, [session, isSessionPending]);

	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Dashboard" />
				<div className="flex w-[80%] flex-col">
					{/* Conditional rendering using logical AND */}
					{!isSessionPending && session?.user?.id && (
						<RequisitionTable
							data={myRequests}
							siteRole="approver"
							userId={session.user.id}
						/>
					)}
					{/* You might want a loading indicator or message if not ready */}
					{isSessionPending && <p>Loading data...</p>}
					{!isSessionPending && !session?.user?.id && (
						<p>User not authenticated or ID missing.</p>
					)}
				</div>
			</div>
		</>
	);
}
