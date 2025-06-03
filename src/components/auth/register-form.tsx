"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const RegisterForm = () => {
	const [isPending, setIsPending] = useState(false);
	const router = useRouter();

	async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
		evt.preventDefault();
		const formData = new FormData(evt.target as HTMLFormElement);

		const name = String(formData.get("name"));
		if (!name) return toast.error("Please enter your name");

		const email = String(formData.get("email"));
		if (!email) return toast.error("Please enter your email");

		const password = String(formData.get("password"));
		if (!password) return toast.error("Please enter your password");

		await signUp.email(
			{
				name,
				email,
				password,
			},
			{
				onRequest: () => {
					setIsPending(true);
				},
				onResponse: () => {
					setIsPending(false);
				},
				onError: (ctx) => {
					toast.error(ctx.error.message);
				},
				onSuccess: () => {
					toast.success("Registration successful. Welcome to Cascade bro.");
					router.push("/profile");
				},
			},
		);
	}

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Name</Label>
				<Input id="name" name="name" />
			</div>

			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input type="email" id="email" name="email" />
			</div>

			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input type="password" id="password" name="password" />
			</div>

			<Button type="submit" className="w-full" disabled={isPending}>
				Register
			</Button>
		</form>
	);
};
