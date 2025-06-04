import { SignOutButton } from "@/components/auth/sign-out-button";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default async function Page() {
  const { data: session, isPending: isSessionPending } = useSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Logged In!</h1>

        <p>
          However, it seems that the higher authorities have not given this email a role yet.
        </p>

        <p>
          To use this application, you must have an assigned role.
        </p>

        <p>
          Thank you for understanding.
        </p>

        <SignOutButton />
      </div>
    </div>
  );
}
