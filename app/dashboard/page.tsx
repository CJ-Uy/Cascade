"use client";

import { useSession } from "@/app/contexts/SessionProvider";

export default function Dashboard() {
  const session = useSession();
 if (!session.authContext) {
   return <header>Loading...</header>; // Or null, as user might be logged out
 }

 return (
   <div className="rounded bg-gray-100 p-4 dark:bg-gray-800">
     <pre>
       {JSON.stringify(session, null, 2)}
      </pre>
   </div>
 );
}
