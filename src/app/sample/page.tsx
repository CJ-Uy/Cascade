"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Sample() {
	const initiatorId = "5ed0c830-5048-4146-95fe-d5559d693a85";
	const ceoId = "8f104365-c913-4100-b63f-9b29ae8d0bf8";

	const [initatorDetails, setInitatorDetails] = useState({});
	const [approvers, setApprovers] = useState([]);

	// Run once on mount
	useEffect(() => {
		// Fetch initiator values
		async function fetchData() {
			try {
				// Get Initiator Details
				let response = await fetch("/api/user/get", {
					method: "POST",
					body: JSON.stringify({ id: initiatorId }),
				});
				const initiatorData = await response.json();
				setInitatorDetails({
					name: initiatorData.name,
					businessUnit: initiatorData.businessUnit[0],
					role: initiatorData.role[0],
				});

				// Get Business Unit Details
				response = await fetch("/api/businessUnit/get", {
					method: "POST",
					body: JSON.stringify({ id: initatorDetails?.businessUnit?.id }),
				});
				const businessUnitData = await response.json();

				// Setup Approvers
				// Show the needed approvers based on the role of the initiator
				const currSystem = businessUnitData.approvalSystem[initiatorData.role[0].id];
				let tempApprovers: any = [];
				for (let i = 0; i < currSystem.length; i++) {
					const response = await fetch("/api/user/getUserFromRole", {
						method: "POST",
						body: JSON.stringify({ id: currSystem[i] }),
					});
					const data = await response.json();

					tempApprovers.push(
						<div key={i} className="flex h-100 w-100 flex-col items-center justify-center border-2">
							<h1>{data.name}</h1>
							<p>
								{data?.businessUnit[0]?.name} || {data?.role[0]?.name}
							</p>

							<div className="flex gap-5">
								<Button variant="destructive">Reject</Button>
								<Button variant="default">Accept</Button>
							</div>
							{/* <pre>
								{JSON.stringify(data,null,2)}
							</pre> */}
						</div>,
					);
				}
				setApprovers(tempApprovers);
			} catch (err) {
				console.error("Failed to fetch data:", err);
			}
		}

		// Fetch the details from the api
		fetchData();
	}, []);

	return (
		<>
			<div className="flex flex-col items-center justify-center">
				{/* Initiator */}
				<div className="flex h-100 w-100 flex-col items-center justify-center border-2">
					<h1>{initatorDetails.name}</h1>
					<p>
						{initatorDetails?.businessUnit?.name} || {initatorDetails?.role?.name}
					</p>

					{/* Forms based on BU details */}

					<Button variant="default">Submit Requisition</Button>
				</div>

				{/* Multiple Approvers before CEO */}
				<div className="flex">{approvers}</div>

				{/* CEO */}
				<div className="flex h-100 w-100 flex-col items-center justify-center border-2">
					<h1>Akiva Approver</h1>
					<div className="flex gap-5">
						<Button variant="destructive">Reject</Button>
						<Button variant="default">Accept</Button>
					</div>
				</div>
			</div>
		</>
	);
}
