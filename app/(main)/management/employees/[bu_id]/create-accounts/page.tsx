import { checkBuPermission } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { CreateAccountsClient } from "./(components)/CreateAccountsClient";

export default async function CreateAccountsPage({
  params,
}: {
  params: Promise<{ bu_id: string }>;
}) {
  const { bu_id } = await params;

  const { hasPermission } = await checkBuPermission(
    bu_id,
    "can_create_accounts",
  );
  if (!hasPermission) redirect("/dashboard");

  return <CreateAccountsClient businessUnitId={bu_id} />;
}
