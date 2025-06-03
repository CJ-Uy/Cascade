import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { ArrowLeftIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Page() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

  if (!session) redirect("/auth/login");

  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Profile</h1>

        <pre className="text-sm overflow-clip">
          {JSON.stringify(session, null, 2)}
        </pre>

        <SignOutButton />
      </div>
    </div>
  );
}
