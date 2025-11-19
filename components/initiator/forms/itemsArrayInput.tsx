"use client";

import {
  Control,
  useFieldArray,
  UseFormReturn,
  useWatch,
} from "react-hook-form";
import { z } from "zod";
import { Trash2 } from "lucide-react"; // Import the icon

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility

// Define the Zod schema for a single item (can be shared or redefined here)
export const itemSchema = z.object({
  name: z.string().min(1, "Item name is required."),
  unit: z.string().min(1, "Unit is required (e.g., pcs, kg)."),
  quantity: z.coerce // Use coerce for inputs that might be strings
    .number({ invalid_type_error: "Quantity must be a number." })
    .min(1, "Quantity must be at least 1."),
  cost: z.coerce
    .number({ invalid_type_error: "Cost must be a number." })
    .min(0, "Cost cannot be negative."),
  remarks: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemsArrayInputProps {
  control: Control<any>; // Use Control<FormValues> if you have a specific overall form type
  name: string; // The name of the field array in the form (e.g., "items")
  label: string;
  optional: boolean;
  form: UseFormReturn<any>; // Pass the form instance for errors
}

export function ItemsArrayInput({
  control,
  name,
  label,
  optional,
  form,
}: ItemsArrayInputProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const handleAddItem = () => {
    append({ name: "", unit: "", quantity: 1, cost: 0, remarks: "" });
  };

  // Helper component for rendering each row's total cost reactively
  const ItemTotalCost = ({
    itemIndex,
    control,
    arrayName,
  }: {
    itemIndex: number;
    control: Control<any>;
    arrayName: string;
  }) => {
    const quantity = useWatch({
      control,
      name: `${arrayName}.${itemIndex}.quantity`,
    });
    const cost = useWatch({
      control,
      name: `${arrayName}.${itemIndex}.cost`,
    });

    const total = (Number(quantity) || 0) * (Number(cost) || 0);
    return <span>{total.toFixed(2)}</span>;
  };

  return (
    <FormItem>
      <FormLabel className="text-lg font-semibold">
        {label}
        {!optional && <span className="text-destructive">*</span>}
      </FormLabel>
      <FormControl>
        <div className="space-y-4">
          {/* Table Headers */}
          {fields.length > 0 && (
            <div className="hidden rounded-md border-b md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_auto] md:gap-2 md:p-2">
              <span className="font-medium">Name</span>
              <span className="font-medium">Unit</span>
              <span className="font-medium">Qty</span>
              <span className="font-medium">Cost</span>
              <span className="font-medium">Total</span>
              <span className="font-medium">Remarks</span>
              <span className="font-medium">Action</span>
            </div>
          )}

          {fields.map((item, index) => (
            <div
              key={item.id}
              className="bg-background grid grid-cols-1 gap-3 rounded-md border p-3 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_auto] md:items-start md:gap-2 md:p-2"
            >
              {/* Name */}
              <FormField
                control={control}
                name={`${name}.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:hidden">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Item name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Unit */}
              <FormField
                control={control}
                name={`${name}.${index}.unit`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:hidden">Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., pcs, kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Quantity */}
              <FormField
                control={control}
                name={`${name}.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:hidden">
                      Quantity
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        min="1"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Cost */}
              <FormField
                control={control}
                name={`${name}.${index}.cost`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:hidden">Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Total Cost (Display Only) */}
              <FormItem>
                <FormLabel className="text-xs md:hidden">Total Cost</FormLabel>
                <div
                  className={cn(
                    "border-input bg-muted flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm",
                    "md:h-auto md:items-start md:border-none md:bg-transparent md:px-0 md:py-0 md:pt-2", // Adjust for desktop alignment
                  )}
                >
                  <ItemTotalCost
                    itemIndex={index}
                    control={control}
                    arrayName={name}
                  />
                </div>
              </FormItem>
              {/* Remarks */}
              <FormField
                control={control}
                name={`${name}.${index}.remarks`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:hidden">Remarks</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Action Button */}
              <div className="flex items-center md:pt-1">
                {" "}
                {/* Adjust alignment for desktop */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:bg-destructive/10"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            className="mt-2"
          >
            Add Item
          </Button>
        </div>
      </FormControl>
      {optional && <FormDescription>This list is optional.</FormDescription>}
      {/* For array-level errors like "at least one item required" */}
      <FormMessage>
        {form.formState.errors[name]?.message?.toString()}
      </FormMessage>
    </FormItem>
  );
}
