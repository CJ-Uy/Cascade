import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col items-start gap-2 m-10">
      <h2 className="mb-4 text-2xl font-bold">Your user details</h2>
      <pre className="rounded border p-3 font-mono text-xs">
        {JSON.stringify(data.claims, null, 2)}
      </pre>
    </div>
  );
}
