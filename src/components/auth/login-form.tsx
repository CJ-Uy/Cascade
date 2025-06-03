"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const LoginForm = () => {
	const [isPending, setIsPending] = useState(false);
	const router = useRouter();

	async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
		evt.preventDefault();
		const formData = new FormData(evt.target as HTMLFormElement);

		const email = String(formData.get("email"));
		if (!email) return toast.error("Please enter your email");

		const password = String(formData.get("password"));
		if (!password) return toast.error("Please enter your password");

    await signIn.email({
        email,
        password,
    }, {
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
          toast.success("Login successful. Welcome back chat.");
          router.push("/profile"); // This can be changed to where the person will go if they manage to successfully register.
        },
    });
  }

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input type="email" id="email" name="email" />
			</div>

			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input type="password" id="password" name="password" />
			</div>

			<Button type="submit" className="w-full" disabled={isPending}>
				Login
			</Button>
		</form>
	);
};
