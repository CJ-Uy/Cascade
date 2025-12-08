"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RolesSelectionTable,
  Role,
} from "@/components/shared/roles-selection-table";

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
}

interface ManageUserRolesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onRolesUpdated: () => void;
}

export function ManageUserRolesDialog({
  isOpen,
  onOpenChange,
  user,
  onRolesUpdated,
}: ManageUserRolesDialogProps) {
  const supabase = createClient();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchRoles() {
      // Fetch all assignable roles (Org and BU scoped) with business unit info
      const { data: allRolesData } = await supabase
        .from("roles")
        .select(
          `
          id,
          name,
          scope,
          is_bu_admin,
          business_unit_id,
          business_units (name)
        `,
        )
        .in("scope", ["ORGANIZATION", "BU"])
        .order("scope", { ascending: true })
        .order("name", { ascending: true });

      if (allRolesData) {
        const rolesWithBuName = allRolesData.map((role: any) => ({
          id: role.id,
          name: role.name,
          scope: role.scope,
          is_bu_admin: role.is_bu_admin,
          business_unit_name: role.business_units?.name || null,
        }));
        setAllRoles(rolesWithBuName);
      }

      // Fetch the user's current roles
      const { data: userRolesData } = await supabase
        .from("user_role_assignments")
        .select("role_id")
        .eq("user_id", user.id);
      if (userRolesData) {
        setSelectedRoleIds(userRolesData.map((r) => r.role_id));
      }
    }

    fetchRoles();
  }, [isOpen, user.id, supabase]);

  const handleSaveChanges = async () => {
    setIsSubmitting(true);

    // First, delete all existing role assignments for this user
    const { error: deleteError } = await supabase
      .from("user_role_assignments")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      toast.error("Failed to update roles", {
        description: deleteError.message,
      });
      setIsSubmitting(false);
      return;
    }

    // Then, insert the new role assignments (only if there are selected roles)
    if (selectedRoleIds.length > 0) {
      const newAssignments = selectedRoleIds.map((roleId) => ({
        user_id: user.id,
        role_id: roleId,
      }));
      const { error: insertError } = await supabase
        .from("user_role_assignments")
        .insert(newAssignments);

      if (insertError) {
        toast.error("Failed to update roles", {
          description: insertError.message,
        });
        setIsSubmitting(false);
        return;
      }
    }

    toast.success("User roles updated successfully");
    onRolesUpdated();
    onOpenChange(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Manage Roles for {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription>
            {user.email && (
              <span className="text-muted-foreground">{user.email}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RolesSelectionTable
            roles={allRoles}
            selectedRoleIds={selectedRoleIds}
            onSelectionChange={setSelectedRoleIds}
            title="Assignable Roles"
            searchPlaceholder="Search roles by name, scope, or business unit..."
            showAdminBadge={true}
            showScope={true}
            showBusinessUnit={true}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
