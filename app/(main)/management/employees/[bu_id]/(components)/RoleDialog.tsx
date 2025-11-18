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
import { Trash2 } from "lucide-react";

interface RoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: Omit<Role, "id"> & { id?: string }) => void;
  onDelete: (role: Role) => void;
  role: Role | null;
}

export function RoleDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  role,
}: RoleDialogProps) {
  const [name, setName] = useState("");
  const [isBuAdmin, setIsBuAdmin] = useState(false);
  const [isDeletable, setIsDeletable] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name);
        setIsBuAdmin(role.is_bu_admin);
        const checkDeletable = async () => {
          const deletable = await isRoleDeletable(role.id);
          setIsDeletable(deletable);
        };
        checkDeletable();
      } else {
        setName("");
        setIsBuAdmin(false);
        setIsDeletable(false);
      }
    }
  }, [isOpen, role]);

  const handleSave = () => {
    onSave({ id: role?.id, name, is_bu_admin: isBuAdmin });
  };

  const handleDelete = () => {
    if (role) {
      onDelete(role);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Create Role"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="is-bu-admin" className="text-right">
              Business Unit Admin Status
            </Label>
            <Switch
              id="is-bu-admin"
              checked={isBuAdmin}
              onCheckedChange={setIsBuAdmin}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div></div>
            <div>
              {role && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!isDeletable}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="col-span-2">
              {!isDeletable && role && (
                <p className="text-muted-foreground text-xs">
                  Cannot delete role with assigned users.
                </p>
              )}
            </div>
          </div>
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
