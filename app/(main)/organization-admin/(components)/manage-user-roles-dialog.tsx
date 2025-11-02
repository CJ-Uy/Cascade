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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Role {
  id: string;
  name: string;
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchRoles() {
      // Fetch all assignable roles (Org and BU scoped)
      const { data: allRolesData } = await supabase
        .from("roles")
        .select("id, name")
        .in("scope", ["ORGANIZATION", "BU"]);
      if (allRolesData) setAllRoles(allRolesData);

      // Fetch the user's current roles
      const { data: userRolesData } = await supabase
        .from("user_role_assignments")
        .select("role_id")
        .eq("user_id", user.id);
      if (userRolesData) setUserRoles(userRolesData.map((r) => r.role_id));
    }

    fetchRoles();
  }, [isOpen, user.id, supabase]);

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setUserRoles((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId),
    );
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);

    // First, delete all existing role assignments for this user
    const { error: deleteError } = await supabase
      .from("user_role_assignments")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      toast.error("Failed to update roles:", {
        description: deleteError.message,
      });
      setIsSubmitting(false);
      return;
    }

    // Then, insert the new role assignments
    const newAssignments = userRoles.map((roleId) => ({
      user_id: user.id,
      role_id: roleId,
    }));
    const { error: insertError } = await supabase
      .from("user_role_assignments")
      .insert(newAssignments);

    if (insertError) {
      toast.error("Failed to update roles:", {
        description: insertError.message,
      });
    } else {
      toast.success("User roles updated successfully.");
      onRolesUpdated();
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Manage Roles for {user.first_name} {user.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <h4 className="font-medium">Assignable Roles</h4>
          <div className="space-y-2">
            {allRoles.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={role.id}
                  checked={userRoles.includes(role.id)}
                  onCheckedChange={(checked) =>
                    handleRoleChange(role.id, !!checked)
                  }
                />
                <Label htmlFor={role.id}>{role.name}</Label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveChanges} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
