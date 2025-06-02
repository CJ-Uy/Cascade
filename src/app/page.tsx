"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
	return (
		<div className="flex flex-col justify-center items-center mt-30 gap-5">
			<h1 className="text-6xl pb-10 font-bold">Cascade</h1>
			<Button><Link href="/auth/login	">Log In</Link></Button>
			<Button><Link href="/auth/register">Create an account</Link></Button>
		</div>
	);
}
