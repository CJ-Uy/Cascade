"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signUp, useSession } from "@/lib/auth-client";
import { redirect, useRouter } from "next/navigation";

export const RegisterForm = () => {
  const { data: session } = useSession();
  const [serverData, setServerData] = useState();
  const [canRedirect, setCanRedirect] = useState(false);

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

  // Redirects user if canRedirect is set to true.
  useEffect(() => {
    if (serverData != null || serverData != undefined) {
      if (serverData == "initiator") {
        redirect("/initiator");
      } else if (serverData == "bu-head") {
        redirect("/bu-head");
      } else if (serverData == "akiva-approver") {
        redirect("/akiva-approver");
      } else if (serverData == "approver") {
        redirect("/approver");
      } else {
        redirect("/norole");
      }
    }
  }, [serverData]);

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
          fetchData();
          setCanRedirect(true);
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
