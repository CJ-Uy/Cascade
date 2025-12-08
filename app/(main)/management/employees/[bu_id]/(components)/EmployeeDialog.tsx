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
import { Save, Trash2 } from "lucide-react";
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

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  onRemoveFromBU: (employee: Employee) => void;
  employee: Employee | null; // Null for create, Employee for edit
  businessUnitId: string;
}

export function EmployeeDialog({
  isOpen,
  onClose,
  onSave,
  onRemoveFromBU,
  employee,
  businessUnitId,
}: EmployeeDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
  const [allAvailableRoles, setAllAvailableRoles] = useState<Role[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchRoles = async () => {
        const roles = await getRoles(businessUnitId);
        setAllAvailableRoles(roles);

        // If editing employee, convert role names to IDs
        if (employee && employee.roles.length > 0) {
          const roleIds = roles
            .filter((r) => employee.roles.includes(r.name))
            .map((r) => r.id);
          setSelectedRoleIds(roleIds);
        }
      };
      fetchRoles();

      if (employee) {
        setName(employee.name);
        setEmail(employee.email);
        setSelectedRoleNames(employee.roles);
      } else {
        setName("");
        setEmail("");
        setSelectedRoleNames([]);
        setSelectedRoleIds([]);
      }
    }
  }, [isOpen, employee, businessUnitId]);

  // Keep role names in sync with IDs for backwards compatibility
  useEffect(() => {
    const roleNames = allAvailableRoles
      .filter((r) => selectedRoleIds.includes(r.id))
      .map((r) => r.name);
    setSelectedRoleNames(roleNames);
  }, [selectedRoleIds, allAvailableRoles]);

  const handleSave = () => {
    if (!name || !email) {
      toast.error("Name and Email are required.");
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = () => {
    const employeeToSave: Employee = {
      id: employee?.id || `emp_${Date.now()}`,
      name,
      email,
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

  return (
    <>
      <Toaster />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
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
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
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
          </div>
          <DialogFooter className="justify-between">
            <div>
              {employee && (
                <Button variant="destructive" onClick={handleRemove}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from BU
                </Button>
              )}
            </div>
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
    </>
  );
}
