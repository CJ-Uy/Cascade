"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
	const { data: session, isPending } = useSession();
	const [serverData, setServerData] = useState();

	useEffect(() => {
		if (session) {
			async function fetchData() {
				try {
					let response = await fetch("/api/user/get", {
						method: "POST",
						body: JSON.stringify({ id: session?.user.id }),
					});
					const data = await response.json();
					setServerData(data["siteRole"]); // Data is now in serverData
				} catch (err) {
					console.error("Failed to fetch data:", err);
				}
			}

			// Fetch the details from the api
			fetchData();

			// Situational Polling if you want to watch data from server
			const intervalId = setInterval(fetchData, 2000); // fetchData every 2 seconds
			return () => {
				clearInterval(intervalId); // Clear the interval
			};
		}
	}, [session]);

	// Redirects user if serverData changes to a valid role.
	useEffect(() => {
		if (serverData == "initiator") {
			redirect("/initiator");
		} else if (serverData == "bu-head") {
			redirect("/bu-head");
		} else if (serverData == "akiva-approver") {
			redirect("/akiva-approver");
		} else if (serverData == "approver") {
			redirect("/approver");
		}
	}, [serverData]);

	if (isPending) {
		return (
			<div className="flex h-dvh flex-col items-center justify-center gap-5">
				<h1 className="pb-5 text-8xl font-bold">Cascade</h1>
				<Button>
					<Link href="/auth/register">Get Started</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-5">
			<h1 className="pb-5 text-8xl font-bold">Cascade</h1>
			<Button>
				<Link href="/auth/login">Get Started</Link>
			</Button>
		</div>
	);
}
