"use client";

import { useSession } from "@/app/contexts/SessionProvider";
import { DashboardHeader } from "@/components/dashboardHeader";

export default function Settings() {
  const session = useSession();

  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Settings" />

      <div className="flex w-[80%] flex-col">
        <pre>{JSON.stringify(session, null, 2)}</pre>
      </div>
    </div>
  );
}
