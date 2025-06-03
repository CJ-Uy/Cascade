"use client";

import { Control, useFieldArray, UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox"; // For boolean types
import type { InferredItemField } from "./listTypes";
interface GenericArrayInputProps {
	control: Control<any>;
	name: string;
	fieldTitle: string;
	optional: boolean;
	form: UseFormReturn<any>;
	sampleItemForInference: Record<string, any>;
	itemFieldOrder?: string[];
}

// Helper to generate a label from a key (e.g., "itemName" -> "Item Name")
const generateLabelFromKey = (key: string): string => {
	const result = key.replace(/([A-Z])/g, " $1"); // Add space before capitals
	return result.charAt(0).toUpperCase() + result.slice(1); // Capitalize first letter
};

// Helper to create a default item for appending based on the sample's types
const createDefaultNewItem = (sampleItem: Record<string, any>): Record<string, any> => {
	const newItem: Record<string, any> = {};
	for (const key in sampleItem) {
		if (Object.prototype.hasOwnProperty.call(sampleItem, key)) {
			const value = sampleItem[key];
			if (typeof value === "number") {
				newItem[key] = 0;
			} else if (typeof value === "boolean") {
				newItem[key] = false;
			} else {
				newItem[key] = ""; // Default for strings or other types
			}
		}
	}
	return newItem;
};

export function GenericArrayInput({
	control,
	name,
	fieldTitle,
	optional,
	form,
	sampleItemForInference,
	itemFieldOrder,
}: GenericArrayInputProps) {
	const {
		fields: rHFFields, // Renaming to avoid conflict
		append,
		remove,
	} = useFieldArray({
		control,
		name,
	});

	const keysInOrder =
		itemFieldOrder && itemFieldOrder.length > 0
			? itemFieldOrder.filter((key) => key in sampleItemForInference)
			: Object.keys(sampleItemForInference);

	// Infer the structure of fields from the sample item
	const inferredFields: InferredItemField[] = keysInOrder.map((key) => {
		const value = sampleItemForInference[key];
		let type: InferredItemField["type"] = "string";
		let defaultValue: InferredItemField["defaultValue"] = "";

		if (typeof value === "number") {
			type = "number";
			defaultValue = 0;
		} else if (typeof value === "boolean") {
			type = "boolean";
			defaultValue = false;
		}
		return {
			key,
			label: generateLabelFromKey(key),
			type,
			defaultValue,
		};
	});
	const defaultNewItem = createDefaultNewItem(sampleItemForInference);

	const handleAddItem = () => {
		append(defaultNewItem);
	};

	return (
		<FormItem className="w-full">
			<FormLabel className="text-foreground text-xl font-semibold">
				{" "}
				{/* Main title for the array */}
				{fieldTitle}
				{!optional && <span className="text-destructive">*</span>}
			</FormLabel>
			<FormControl>
				<div className="mt-3 space-y-6">
					{" "}
					{/* Space between each item card */}
					{rHFFields.map((rhfItem, index) => (
						<div
							key={rhfItem.id}
							className="bg-card rounded-lg border p-4 shadow transition-all hover:shadow-md" // Card for each item
						>
							<div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
								{" "}
								{/* Responsive grid for fields within a card */}
								{inferredFields.map((inferredFieldConfig) => (
									<FormField
										control={control}
										name={`${name}.${index}.${inferredFieldConfig.key}`}
										key={inferredFieldConfig.key}
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-muted-foreground text-sm font-medium">
													{inferredFieldConfig.label}
												</FormLabel>
												<FormControl className="mt-1">
													{inferredFieldConfig.type === "boolean" ? (
														<div className="flex items-center space-x-2 pt-2">
															<Checkbox
																checked={field.value}
																onCheckedChange={field.onChange}
																id={`${name}.${index}.${inferredFieldConfig.key}`}
															/>
															<label // Optional: if you want a clickable label beside checkbox
																htmlFor={`${name}.${index}.${inferredFieldConfig.key}`}
																className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
															>
																{/* You can put the label text here again if desired */}
															</label>
														</div>
													) : (
														<Input
															type={
																inferredFieldConfig.type === "string"
																	? "text"
																	: inferredFieldConfig.type // "number"
															}
															placeholder={`Enter ${inferredFieldConfig.label.toLowerCase()}`}
															{...field}
															value={field.value ?? inferredFieldConfig.defaultValue}
															onChange={(e) => {
																let value: string | number | boolean = e.target.value;
																if (inferredFieldConfig.type === "number") {
																	value =
																		e.target.value === ""
																			? "" // Allow empty string for temp input state
																			: parseFloat(e.target.value);
																}
																field.onChange(value);
															}}
														/>
													)}
												</FormControl>
												<FormMessage className="mt-1 text-xs" />
											</FormItem>
										)}
									/>
								))}
							</div>
							{/* Remove Button for the item card */}
							<div className="mt-4 flex justify-end border-t pt-3 sm:mt-5 sm:pt-4">
								<Button
									type="button"
									variant="ghost"
									size="sm" // Slightly larger for easier clicking
									onClick={() => remove(index)}
									className="text-destructive hover:bg-destructive/10 hover:text-destructive text-sm"
									aria-label={`Remove ${fieldTitle
										.replace(/s$/, "") // Make singular
										.toLowerCase()} item`}
								>
									<Trash2 className="mr-1.5 h-4 w-4" />
									Remove
								</Button>
							</div>
						</div>
					))}
					{/* Add Item Button */}
					{inferredFields.length > 0 && (
						<Button
							type="button"
							variant="default"
							onClick={handleAddItem}
							className="mt-1 w-full sm:w-auto" // Full width on small screens
						>
							Add +
						</Button>
					)}
					{inferredFields.length === 0 && rHFFields.length === 0 && (
						<p className="text-muted-foreground text-sm">
							This list is empty or its structure could not be determined from the template.
						</p>
					)}
				</div>
			</FormControl>
			{optional && (
				<FormDescription className="mt-2 text-xs">This list is optional.</FormDescription>
			)}
			{/* Array-level error message */}
			<FormMessage className="mt-2 text-sm">
				{form.formState.errors[name]?.message?.toString()}
			</FormMessage>
		</FormItem>
	);
}
