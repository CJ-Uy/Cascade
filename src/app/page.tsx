"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
	return (
		<div className="mt-30 flex flex-col items-center justify-center gap-5">
			<h1 className="pb-10 text-6xl font-bold">Cascade</h1>
			<Button>
				<Link href="/auth/login	">Log In</Link>
			</Button>
			<Button>
				<Link href="/auth/register">Create an account</Link>
			</Button>
		</div>
	);
}
