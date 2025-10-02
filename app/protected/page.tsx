import { getUserAuthContext } from "@/lib/supabase/auth";

export default async function ProtectedPage() {
  const authContext = await getUserAuthContext();

  if (!authContext) {
    return <div>Not logged in.</div>;
  }

  return (
    <div className="m-10">
      <h1 className="text-3xl font-bold">Welcome to the Protected Dashboard</h1>
      <p className="mt-2">
        Use the selector in the navbar to switch your Business Unit context.
      </p>
      <div className="mt-8">
        <h2 className="text-xl font-bold">
          Your Full Auth Data (from Server Component)
        </h2>
        <pre className="mt-2 rounded border p-3 font-mono text-xs">
          {JSON.stringify(authContext, null, 2)}
        </pre>
      </div>
    </div>
  );
}
