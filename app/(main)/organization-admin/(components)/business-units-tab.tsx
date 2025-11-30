"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { EditBuDialog } from "./edit-bu-dialog";
import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import {
  createBusinessUnitsColumns,
  BusinessUnitWithHead,
} from "./business-units-columns";
import { deleteBusinessUnitAction } from "../actions";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BusinessUnitsTabNewProps {
  businessUnits: BusinessUnitWithHead[];
  users: any[];
}

export function BusinessUnitsTabNew({
  businessUnits,
  users,
}: BusinessUnitsTabNewProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBu, setSelectedBu] = useState<BusinessUnitWithHead | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [buToDelete, setBuToDelete] = useState<BusinessUnitWithHead | null>(null);

  const handleEdit = (bu: BusinessUnitWithHead) => {
    setSelectedBu(bu);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (bu: BusinessUnitWithHead) => {
    setBuToDelete(bu);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!buToDelete) return;

    const result = await deleteBusinessUnitAction(buToDelete.id);
    if (result.error) {
      toast.error("Failed to delete business unit", { description: result.error });
    } else {
      toast.success("Business unit deleted successfully");
      router.refresh();
    }
    setIsDeleteDialogOpen(false);
    setBuToDelete(null);
  };

  const handleBuUpdated = () => {
    router.refresh();
    setIsEditDialogOpen(false);
  };

  const columns = createBusinessUnitsColumns(handleEdit, handleDeleteClick);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Business Units</CardTitle>
            </div>
            <CardDescription>
              Manage business units within your organization
            </CardDescription>
          </div>
          <Button asChild className="gap-2">
            <Link href="/organization-admin/business-units/new">
              <Plus className="h-4 w-4" />
              Add Business Unit
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={businessUnits}
            searchColumn="name"
            searchPlaceholder="Search business units..."
          />
        </CardContent>
      </Card>

      {selectedBu && (
        <EditBuDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          businessUnit={{
            id: selectedBu.id,
            name: selectedBu.name,
            head_id: selectedBu.head_id || "",
          }}
          users={users}
          onBuUpdated={handleBuUpdated}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the business unit "{buToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
