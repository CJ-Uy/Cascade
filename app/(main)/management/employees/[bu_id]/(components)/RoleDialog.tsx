"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Role } from "./RolesTable";

import { isRoleDeletable } from "../../actions";
import { Trash2, Info } from "lucide-react";

interface RoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: Omit<Role, "id"> & { id?: string }) => void;
  onDelete: (role: Role) => void;
  role: Role | null;
  isBuHead?: boolean;
}

export function RoleDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  role,
  isBuHead = false,
}: RoleDialogProps) {
  const [name, setName] = useState("");
  const [isBuAdmin, setIsBuAdmin] = useState(false);
  const [canManageEmployeeRoles, setCanManageEmployeeRoles] = useState(false);
  const [canManageBuRoles, setCanManageBuRoles] = useState(false);
  const [canCreateAccounts, setCanCreateAccounts] = useState(false);
  const [canResetPasswords, setCanResetPasswords] = useState(false);
  const [canManageForms, setCanManageForms] = useState(false);
  const [canManageWorkflows, setCanManageWorkflows] = useState(false);
  const [isDeletable, setIsDeletable] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
        setIsBuAdmin(role.is_bu_admin);
        setCanManageEmployeeRoles(role.can_manage_employee_roles);
        setCanManageBuRoles(role.can_manage_bu_roles);
        setCanCreateAccounts(role.can_create_accounts);
        setCanResetPasswords(role.can_reset_passwords);
        setCanManageForms(role.can_manage_forms);
        setCanManageWorkflows(role.can_manage_workflows);
        const checkDeletable = async () => {
          const result = await isRoleDeletable(role.id);
          setIsDeletable(result.deletable);
          setDeleteReason(result.reason);
        };
        checkDeletable();
      } else {
        setName("");
        setIsBuAdmin(false);
        setCanManageEmployeeRoles(false);
        setCanManageBuRoles(false);
        setCanCreateAccounts(false);
        setCanResetPasswords(false);
        setCanManageForms(false);
        setCanManageWorkflows(false);
        setIsDeletable(false);
        setDeleteReason(undefined);
      }
    }
  }, [isOpen, role]);

  const handleSave = () => {
    onSave({
      id: role?.id,
      name,
      is_bu_admin: isBuHead ? isBuAdmin : false,
      can_manage_employee_roles: isBuAdmin
        ? true
        : isBuHead
          ? canManageEmployeeRoles
          : false,
      can_manage_bu_roles: isBuAdmin
        ? true
        : isBuHead
          ? canManageBuRoles
          : false,
      can_create_accounts: isBuAdmin
        ? true
        : isBuHead
          ? canCreateAccounts
          : false,
      can_reset_passwords: isBuAdmin
        ? true
        : isBuHead
          ? canResetPasswords
          : false,
      can_manage_forms: isBuAdmin ? true : isBuHead ? canManageForms : false,
      can_manage_workflows: isBuAdmin
        ? true
        : isBuHead
          ? canManageWorkflows
          : false,
    });
  };

  const handleDelete = () => {
    if (role) {
      onDelete(role);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Create Role"}</DialogTitle>
          <DialogDescription>
            {isBuHead
              ? "Configure the role name and permissions."
              : "Configure the role name. Only BU Heads can manage capabilities."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Role Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>

          {isBuHead ? (
            <>
              <div className="border-t pt-4">
                <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                  Employee Management
                </p>
                <div className="space-y-3">
                  {(
                    [
                      {
                        id: "can-manage-employee-roles",
                        title: "Manage Employee Roles",
                        description:
                          "Assign and unassign member-type roles to employees",
                        checked: canManageEmployeeRoles,
                        onChange: setCanManageEmployeeRoles,
                      },
                      {
                        id: "can-manage-bu-roles",
                        title: "Manage BU Roles",
                        description:
                          "Create, rename, and delete member-type roles (no capability editing)",
                        checked: canManageBuRoles,
                        onChange: setCanManageBuRoles,
                      },
                      {
                        id: "can-create-accounts",
                        title: "Create Accounts",
                        description:
                          "Mass-create new user accounts and assign member-type roles",
                        checked: canCreateAccounts,
                        onChange: setCanCreateAccounts,
                      },
                      {
                        id: "can-reset-passwords",
                        title: "Reset Passwords",
                        description:
                          "Reset passwords for members of the business unit",
                        checked: canResetPasswords,
                        onChange: setCanResetPasswords,
                      },
                    ] as const
                  ).map((perm) => (
                    <div key={perm.id} className="flex items-start gap-3">
                      <Switch
                        id={perm.id}
                        checked={isBuAdmin || perm.checked}
                        disabled={isBuAdmin}
                        onCheckedChange={perm.onChange}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={perm.id}
                          className="text-sm leading-none font-medium"
                        >
                          {perm.title}
                        </Label>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                  Forms & Workflows
                </p>
                <div className="space-y-3">
                  {(
                    [
                      {
                        id: "can-manage-forms",
                        title: "Forms Management",
                        description: "Access to the management forms page",
                        checked: canManageForms,
                        onChange: setCanManageForms,
                      },
                      {
                        id: "can-manage-workflows",
                        title: "Workflows Management",
                        description: "Access to the management workflows page",
                        checked: canManageWorkflows,
                        onChange: setCanManageWorkflows,
                      },
                    ] as const
                  ).map((perm) => (
                    <div key={perm.id} className="flex items-start gap-3">
                      <Switch
                        id={perm.id}
                        checked={isBuAdmin || perm.checked}
                        disabled={isBuAdmin}
                        onCheckedChange={perm.onChange}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={perm.id}
                          className="text-sm leading-none font-medium"
                        >
                          {perm.title}
                        </Label>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start gap-3">
                  <Switch
                    id="is-bu-admin"
                    checked={isBuAdmin}
                    onCheckedChange={setIsBuAdmin}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="is-bu-admin"
                      className="text-sm leading-none font-medium"
                    >
                      BU Head
                    </Label>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Full control over the business unit. All permissions above
                      are granted automatically.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground text-xs">
                Only BU Heads can configure role capabilities. You can create
                and rename member-type roles.
              </p>
            </div>
          )}

          {role && (
            <div className="flex items-center gap-3 border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={!isDeletable}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Role
              </Button>
              {!isDeletable && deleteReason && (
                <p className="text-muted-foreground text-xs">{deleteReason}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90"
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
