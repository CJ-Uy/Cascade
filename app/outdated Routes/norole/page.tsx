import { SignOutButton } from "@/app/auth/(components)/sign-out-button";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function NoRole() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto max-w-screen-lg space-y-8 px-8 py-16">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Logged In!</h1>

        <p>
          However, it seems like the authorities have not given this email a
          role yet.
        </p>

        <p>To use this application, you must have an assigned role.</p>

        <p>Thank you for understanding.</p>

        <SignOutButton />
      </div>
    </div>
  );
}
