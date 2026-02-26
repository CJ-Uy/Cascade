"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, KeyRound, RefreshCw, UserX } from "lucide-react";
import { Employee } from "./EmployeeTable";
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
import { getRoles } from "../../actions";
import {
  RolesSelectionTable,
  Role,
} from "@/components/shared/roles-selection-table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  adminResetPassword,
  deleteUserAccount,
} from "../create-accounts/actions";

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  onRemoveFromBU: (employee: Employee) => void;
  onDeleteAccount?: (employee: Employee) => void;
  employee: Employee | null;
  businessUnitId: string;
  isBuHead?: boolean;
  canResetPasswords?: boolean;
  canDeleteAccounts?: boolean;
}

// Helper: check if a role is a "member-type" role (no capabilities, not BU Head)
function isMemberTypeRole(role: any): boolean {
  return (
    !role.is_bu_admin &&
    !role.can_manage_employee_roles &&
    !role.can_manage_bu_roles &&
    !role.can_create_accounts &&
    !role.can_reset_passwords &&
    !role.can_manage_forms &&
    !role.can_manage_workflows
  );
}

export function EmployeeDialog({
  isOpen,
  onClose,
  onSave,
  onRemoveFromBU,
  onDeleteAccount,
  employee,
  businessUnitId,
  isBuHead = false,
  canResetPasswords = false,
  canDeleteAccounts = false,
}: EmployeeDialogProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
  const [allAvailableRoles, setAllAvailableRoles] = useState<Role[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchRoles = async () => {
        const roles = await getRoles(businessUnitId);

        // Filter roles: non-BU-Head users only see member-type roles
        const filteredRoles = isBuHead ? roles : roles.filter(isMemberTypeRole);

        setAllAvailableRoles(filteredRoles);

        // If editing employee, convert role names to IDs
        if (employee && employee.roles.length > 0) {
          const roleIds = filteredRoles
            .filter((r: any) => employee.roles.includes(r.name))
            .map((r: any) => r.id);
          setSelectedRoleIds(roleIds);
        }
      };
      fetchRoles();

      if (employee) {
        setName(employee.name);
        setUsername(employee.username);
        setSelectedRoleNames(employee.roles);
      } else {
        setName("");
        setUsername("");
        setSelectedRoleNames([]);
        setSelectedRoleIds([]);
      }

      setShowPasswordReset(false);
      setNewPassword("");
    }
  }, [isOpen, employee, businessUnitId, isBuHead]);

  // Keep role names in sync with IDs for backwards compatibility
  useEffect(() => {
    const roleNames = allAvailableRoles
      .filter((r) => selectedRoleIds.includes(r.id))
      .map((r) => r.name);
    setSelectedRoleNames(roleNames);
  }, [selectedRoleIds, allAvailableRoles]);

  const handleSave = () => {
    if (!name || !username) {
      toast.error("Name and Username are required.");
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = () => {
    const employeeToSave: Employee = {
      id: employee?.id || `emp_${Date.now()}`,
      name,
      username,
      email: "",
      roles: selectedRoleNames,
    };
    onSave(employeeToSave);
    setShowSaveConfirm(false);
  };

  const handleRemove = () => {
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = () => {
    if (employee) {
      onRemoveFromBU(employee);
    }
    setShowRemoveConfirm(false);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!employee) return;
    setIsDeleting(true);
    const result = await deleteUserAccount(employee.id, businessUnitId);
    setIsDeleting(false);
    if (result.success) {
      toast.success(`Account "${employee.username}" has been deleted.`);
      setShowDeleteConfirm(false);
      onDeleteAccount?.(employee);
    } else {
      toast.error(result.error || "Failed to delete account.");
    }
  };

  const generatePassword = useCallback(() => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pw = "";
    for (let i = 0; i < 8; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewPassword(pw);
  }, []);

  const handleResetPassword = async () => {
    if (!employee || !newPassword) return;
    setIsResetting(true);
    const result = await adminResetPassword(
      employee.id,
      newPassword,
      businessUnitId,
    );
    setIsResetting(false);
    if (result.success) {
      toast.success("Password reset successfully.");
      setShowPasswordReset(false);
      setNewPassword("");
    } else {
      toast.error(result.error || "Failed to reset password.");
    }
  };

  return (
    <>
      <Toaster />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {employee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {employee
                ? `Editing roles for ${employee.name}.`
                : "Add a new employee to your business unit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                disabled={!!employee}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3 font-mono"
                disabled={!!employee}
              />
            </div>
            <RolesSelectionTable
              roles={allAvailableRoles}
              selectedRoleIds={selectedRoleIds}
              onSelectionChange={setSelectedRoleIds}
              title="Roles"
              searchPlaceholder="Search roles..."
              showAdminBadge={true}
              showScope={false}
              showBusinessUnit={false}
            />

            {/* Actions Section */}
            {employee && (canResetPasswords || canDeleteAccounts) && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Actions
                </p>

                {/* Password Reset */}
                {canResetPasswords && (
                  <>
                    {!showPasswordReset ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPasswordReset(true)}
                        className="w-full justify-start"
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset Password
                      </Button>
                    ) : (
                      <div className="space-y-3 rounded-md border p-3">
                        <p className="text-sm font-medium">Reset Password</p>
                        <div className="flex gap-2">
                          <Input
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={generatePassword}
                            title="Generate password"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleResetPassword}
                            disabled={
                              !newPassword ||
                              newPassword.length < 6 ||
                              isResetting
                            }
                          >
                            {isResetting ? "Resetting..." : "Confirm Reset"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowPasswordReset(false);
                              setNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {newPassword && newPassword.length < 6 && (
                          <p className="text-destructive text-xs">
                            Password must be at least 6 characters.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Remove from BU */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  className="text-destructive hover:bg-destructive/10 w-full justify-start"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from Business Unit
                </Button>

                {/* Delete Account */}
                {canDeleteAccounts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAccount}
                    className="w-full justify-start border-red-800 text-red-800 hover:bg-red-800/10"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Delete Account Permanently
                  </Button>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to the employee's
              roles?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              className="bg-primary hover:bg-primary/90"
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user from the business unit and unassign all
              their roles within it. They can be added back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for{" "}
              <strong>{employee?.username}</strong>. This action cannot be
              undone. The user will be removed from all business units and their
              auth credentials will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-800 hover:bg-red-900"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
