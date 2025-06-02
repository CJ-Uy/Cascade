"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
	const { data: session, isPending } = useSession();

	if (session) {
		redirect("/profile"); // Can change to whatever they have to go to if they are logged in.
	}

	if (isPending) {
		return (
			<div className="flex flex-col justify-center items-center h-dvh gap-5">
				<h1 className="text-8xl pb-5 font-bold">Cascade</h1>
				<Button><Link href="/auth/register">Get Started</Link></Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col justify-center items-center h-dvh gap-5">
			<h1 className="text-8xl pb-5 font-bold">Cascade</h1>
			<Button><Link href="/auth/login">Get Started</Link></Button>
		</div>
	);
}
