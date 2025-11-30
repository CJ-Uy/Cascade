"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { EditBuDialog } from "./edit-bu-dialog";
import { useRouter } from "next/navigation";

// Define the type for a single business unit
interface BusinessUnit {
  id: string;
  name: string;
  head_id: string;
}

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface BusinessUnitsTabProps {
  businessUnits: BusinessUnit[];
  users: User[];
}

export function BusinessUnitsTab({
  businessUnits,
  users,
}: BusinessUnitsTabProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBu, setSelectedBu] = useState<BusinessUnit | null>(null);

  const handleManageClick = (bu: BusinessUnit) => {
    setSelectedBu(bu);
    setIsDialogOpen(true);
  };

  const handleBuUpdated = () => {
    // Refresh the page to show the updated data
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Business Units</CardTitle>
          <Button asChild>
            <Link href="/organization-admin/business-units/new">Add BU</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {businessUnits && businessUnits.length > 0 ? (
            <ul className="space-y-2">
              {businessUnits.map((bu) => (
                <li
                  key={bu.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span>{bu.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageClick(bu)}
                  >
                    Manage
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No business units found for this organization.</p>
          )}
        </CardContent>
      </Card>

      {selectedBu && (
        <EditBuDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          businessUnit={selectedBu}
          users={users}
          onBuUpdated={handleBuUpdated}
        />
      )}
    </>
  );
}
