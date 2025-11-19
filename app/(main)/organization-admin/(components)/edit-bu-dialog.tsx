"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateBusinessUnitAction, deleteBusinessUnitAction } from "../actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Business Unit name must be at least 2 characters." }),
  head_id: z.string().uuid({ message: "Please select a Business Unit Head." }),
});

type EditBuFormValues = z.infer<typeof formSchema>;

interface EditBuDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  businessUnit: {
    id: string;
    name: string;
    head_id: string;
  };
  users: { id: string; first_name: string | null; last_name: string | null }[];
  onBuUpdated: () => void;
}

export function EditBuDialog({
  isOpen,
  onOpenChange,
  businessUnit,
  users,
  onBuUpdated,
}: EditBuDialogProps) {
  const form = useForm<EditBuFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: businessUnit.name,
      head_id: businessUnit.head_id,
    },
  });

  async function onSubmit(values: EditBuFormValues) {
    const result = await updateBusinessUnitAction(businessUnit.id, {
      name: values.name,
      headId: values.head_id,
    });

    if (result.error) {
      toast.error("Failed to update Business Unit:", {
        description: result.error,
      });
    } else {
      toast.success("Business Unit updated successfully.");
      onBuUpdated();
      onOpenChange(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this business unit?")) {
      return;
    }

    const result = await deleteBusinessUnitAction(businessUnit.id);

    if (result.error) {
      toast.error("Failed to delete Business Unit:", {
        description: result.error,
      });
    } else {
      toast.success("Business Unit deleted successfully.");
      onBuUpdated();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Business Unit</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="head_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit Head</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={form.formState.isSubmitting}
              >
                Delete
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
