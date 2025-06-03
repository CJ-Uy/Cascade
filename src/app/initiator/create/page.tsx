"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { GenericArrayInput } from "@/components/initiator/forms/genericArrayInput";
import type {
	TemplateValue,
	TemplatesData,
	ArrayFieldDefault, // Import the new type
} from "@/components/initiator/forms/listTypes";

const sanitizeFieldName = (title: string): string => {
	return title
		.toLowerCase()
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_]/g, "");
};

const generateLabelFromKey = (key: string): string => {
	const result = key.replace(/([A-Z])|_/g, (match, p1) => (p1 ? ` ${p1}` : " "));
	return result.charAt(0).toUpperCase() + result.slice(1).trim();
};

// Helper to check if a default value is our special [object, string[]] structure
const isSpecialArrayDefault = (def: any): def is ArrayFieldDefault => {
	return (
		Array.isArray(def) &&
		def.length === 2 &&
		typeof def[0] === "object" &&
		def[0] !== null &&
		Array.isArray(def[1]) &&
		def[1].every((item: any) => typeof item === "string")
	);
};

const generateFormConfig = (fields: TemplateValue[]) => {
	const shape: Record<string, z.ZodTypeAny> = {};
	const defaultValuesForForm: Record<string, any> = {};

	fields.forEach((field) => {
		const fieldName = sanitizeFieldName(field.title);
		let sampleItem: Record<string, any> | null = null;
		let formInitialDefault: Record<string, any>[] = []; // For the form's useFieldArray

		if (isSpecialArrayDefault(field.default)) {
			sampleItem = field.default[0];
			// For useFieldArray, we only want an array of items, not the [item, orderArray] structure.
			// So, we provide the sample item as the initial state for the form.
			formInitialDefault = [sampleItem]; // Or just [] if you want it to start empty despite the sample
		} else if (
			Array.isArray(field.default) &&
			field.default.length > 0 &&
			typeof field.default[0] === "object" &&
			field.default[0] !== null
		) {
			// Fallback: simple array of objects, first item is sample, all items are default
			sampleItem = field.default[0] as Record<string, any>;
			formInitialDefault = field.default as Record<string, any>[];
		}

		if (sampleItem) {
			const itemShape: Record<string, z.ZodTypeAny> = {};
			for (const key in sampleItem) {
				if (Object.prototype.hasOwnProperty.call(sampleItem, key)) {
					const value = sampleItem[key];
					if (typeof value === "number") {
						itemShape[key] = z.coerce.number().default(0);
					} else if (typeof value === "boolean") {
						itemShape[key] = z.boolean().default(false);
					} else {
						itemShape[key] = z
							.string()
							.min(1, `${generateLabelFromKey(key)} cannot be empty.`)
							.default("");
					}
				}
			}

			const zodItemSchema = z.object(itemShape);
			let arraySchema = z.array(zodItemSchema);

			if (!field.optional) {
				const singularItemName = field.title.endsWith("s")
					? field.title.slice(0, -1).toLowerCase()
					: field.title.toLowerCase();
				arraySchema = arraySchema.min(1, `At least one ${singularItemName} is required.`);
			}
			shape[fieldName] = arraySchema;
			defaultValuesForForm[fieldName] = formInitialDefault; // This is what useForm gets
		} else if (typeof field.default === "string") {
			defaultValuesForForm[fieldName] = field.default;
			let stringType = z.string();
			if (!field.optional) {
				stringType = stringType.min(1, `${field.title} cannot be empty.`);
			}
			shape[fieldName] = stringType;
		} else if (Array.isArray(field.default) && field.default.length === 0) {
			defaultValuesForForm[fieldName] = ""; // Default to empty string for the form field
			shape[fieldName] = z.string().optional();
			if (!field.optional) {
				shape[fieldName] = z.string().min(1, `${field.title} (list) cannot be empty.`);
			}
		} else {
			defaultValuesForForm[fieldName] = String(field.default ?? "");
			shape[fieldName] = z.string().optional();
		}
	});

	return { schema: z.object(shape), defaultValues: defaultValuesForForm };
};

export default function CreateRequisitionPage() {
	const [templatesData, setTemplatesData] = useState<TemplatesData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");

	const [dynamicSchema, setDynamicSchema] = useState(() => z.object({}));
	const [dynamicDefaults, setDynamicDefaults] = useState<Record<string, any>>({});

	const form = useForm<Record<string, any>>({
		resolver: zodResolver(dynamicSchema),
		defaultValues: dynamicDefaults,
		mode: "onChange",
	});

	useEffect(() => {
		async function loadTemplates() {
			setIsLoading(true);
			try {
				// Fetch templates from the API
				const response = await fetch("/api/businessUnit/getTemplates", {
					method: "POST",
					body: JSON.stringify({
						id: "d8f5997b-eabc-4fe4-96fe-50d9c97146aa", // TODO: Replace with actual user ID when auth works
					}),
				});
				if (!response.ok) {
					throw new Error(`API error: ${response.statusText}`);
				}
				const data = await response.json();
				console.log(
					"Fetched templatesData (New Default Structure Check):",
					JSON.stringify(data, null, 2),
				);
				setTemplatesData(data);
			} catch (err) {
				console.error("Failed to fetch templates:", err);
				toast.error(
					`Failed to load templates: ${err instanceof Error ? err.message : "Unknown error"}`,
				);
				setTemplatesData(null);
			} finally {
				setIsLoading(false);
			}
		}
		loadTemplates();
	}, []);

	useEffect(() => {
		if (!templatesData) {
			form.reset({});
			setDynamicSchema(z.object({}));
			setDynamicDefaults({});
			return;
		}

		if (selectedTemplateKey && templatesData[selectedTemplateKey]) {
			const selectedTemplate = templatesData[selectedTemplateKey];
			const { schema, defaultValues } = generateFormConfig(selectedTemplate.values);
			setDynamicSchema(schema);
			setDynamicDefaults(defaultValues);
			form.reset(defaultValues);
		} else {
			form.reset({});
			setDynamicSchema(z.object({}));
			setDynamicDefaults({});
		}
	}, [selectedTemplateKey, templatesData, form.reset]);

	function onSubmit(data: Record<string, any>) {
		toast("You submitted the following values:", {
			description: (
				<pre className="mt-2 w-full max-w-md overflow-x-auto rounded-md bg-neutral-950 p-4">
					<code className="text-white">{JSON.stringify(data, null, 2)}</code>
				</pre>
			),
		});
		console.log("Form data submitted:", data);
	}

	if (isLoading) {
		return (
			<div className="flex h-screen flex-col items-center justify-center">
				<h1 className="mb-4 text-2xl font-bold">Create Requisition</h1>
				<p>Loading templates...</p>
			</div>
		);
	}

	const selectedTemplate =
		templatesData && selectedTemplateKey ? templatesData[selectedTemplateKey] : null;

	return (
		<>
			<div className="flex flex-col items-center justify-center p-4 md:p-8">
				<h1 className="mb-6 text-3xl font-semibold">Create Requisition</h1>

				<div className="bg-card w-full max-w-4xl rounded-lg border p-6 shadow-sm">
					<div className="mb-6">
						<label
							htmlFor="template-select"
							className="text-foreground mb-1.5 block text-sm font-medium"
						>
							Select Template Type
						</label>
						<Select
							onValueChange={(value) => setSelectedTemplateKey(value)}
							value={selectedTemplateKey}
						>
							<SelectTrigger id="template-select" className="w-full">
								<SelectValue placeholder="Select a template" />
							</SelectTrigger>
							<SelectContent>
								{templatesData && Object.keys(templatesData).length > 0 ? (
									Object.keys(templatesData).map((key) => (
										<SelectItem key={key} value={key}>
											{key}
										</SelectItem>
									))
								) : (
									<SelectItem value="none" disabled>
										No templates available
									</SelectItem>
								)}
							</SelectContent>
						</Select>
					</div>

					{selectedTemplateKey && selectedTemplate && (
						<div>
							<h2 className="mb-5 text-center text-2xl font-semibold">{selectedTemplateKey}</h2>
							<Form {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
									{selectedTemplate.values.map((fieldConfig) => {
										const fieldName = sanitizeFieldName(fieldConfig.title);
										let sampleItemForInference: Record<string, any> | null = null;
										let itemFieldOrder: string[] | undefined = undefined;

										if (isSpecialArrayDefault(fieldConfig.default)) {
											sampleItemForInference = fieldConfig.default[0];
											itemFieldOrder = fieldConfig.default[1];
										} else if (
											Array.isArray(fieldConfig.default) &&
											fieldConfig.default.length > 0 &&
											typeof fieldConfig.default[0] === "object" &&
											fieldConfig.default[0] !== null
										) {
											sampleItemForInference = fieldConfig.default[0] as Record<string, any>;
											// No explicit order, GenericArrayInput will use Object.keys
										}

										if (sampleItemForInference) {
											return (
												<GenericArrayInput
													key={fieldName}
													control={form.control}
													name={fieldName}
													fieldTitle={fieldConfig.title}
													optional={fieldConfig.optional}
													form={form}
													sampleItemForInference={sampleItemForInference}
													itemFieldOrder={itemFieldOrder} // Pass the extracted order
												/>
											);
										} else {
											// Handles strings and empty arrays
											const useTextarea =
												fieldConfig.title === "Notes" ||
												(Array.isArray(fieldConfig.default) && fieldConfig.default.length === 0);
											return (
												<FormField
													control={form.control}
													name={fieldName}
													key={fieldName}
													render={({ field }) => (
														<FormItem>
															<FormLabel>
																{fieldConfig.title}{" "}
																{Array.isArray(fieldConfig.default) &&
																fieldConfig.default.length === 0
																	? "(List - enter items separated by new lines)"
																	: ""}
															</FormLabel>
															<FormControl>
																{useTextarea ? (
																	<Textarea
																		placeholder={`Enter ${fieldConfig.title.toLowerCase()}`}
																		{...field}
																		value={field.value || ""}
																	/>
																) : (
																	<Input
																		placeholder={`Enter ${fieldConfig.title.toLowerCase()}`}
																		{...field}
																		value={field.value || ""}
																	/>
																)}
															</FormControl>
															{fieldConfig.optional && (
																<FormDescription>This field is optional.</FormDescription>
															)}
															<FormMessage />
														</FormItem>
													)}
												/>
											);
										}
									})}
									<Button type="submit" className="bg-accent hover:bg-accent/80 w-full md:w-auto">
										Submit
									</Button>
								</form>
							</Form>
						</div>
					)}
					{!selectedTemplateKey && !isLoading && templatesData && (
						<p className="mt-4 text-center text-neutral-500">
							Please select a template to view and fill out the form.
						</p>
					)}
				</div>
			</div>
		</>
	);
}
