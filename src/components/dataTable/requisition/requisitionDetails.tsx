import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Requisition, Item as RequisitionItem, Approval } from "./types"; // Adjust path

interface RequisitionDetailsProps {
	requisition: Requisition;
}

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD", // Adjust currency as needed
	}).format(amount);

const RequisitionDetails: React.FC<RequisitionDetailsProps> = ({ requisition }) => {
	if (!requisition) return null;

	const { values, initiator, fromBU, approvals, stage } = requisition;

	const hasBrandOrSupplier = values.items.some((item) => item.brand || item.supplier);

	return (
		<div className="space-y-4 p-1">
			<Card>
				<CardHeader>
					<CardTitle>General Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-1 text-sm">
					<p>
						<strong>ID:</strong> {requisition.id}
					</p>
					<p>
						<strong>Template:</strong> {requisition.templateName}
					</p>
					<p>
						<strong>Created:</strong> {new Date(requisition.createdAt).toLocaleString()}
					</p>
					<p>
						<strong>Updated:</strong> {new Date(requisition.updatedAt).toLocaleString()}
					</p>
					<p>
						<strong>Current Stage:</strong> {stage + 1} / {approvals.length}
					</p>
				</CardContent>
			</Card>

			<Accordion
				type="multiple"
				collapsible
				className="w-full"
				defaultValue={["values", "approvals"]}
			>
				<AccordionItem value="values">
					<AccordionTrigger>Request Values</AccordionTrigger>
					<AccordionContent>
						<Card>
							<CardContent className="space-y-3 pt-4 text-sm">
								{values.description && (
									<p>
										<strong>Description:</strong> {values.description}
									</p>
								)}
								{values.details && (
									<p>
										<strong>Details:</strong> {values.details}
									</p>
								)}

								{values.items && values.items.length > 0 && (
									<div>
										<h4 className="mt-2 mb-2 text-base font-semibold">Items:</h4>
										<div className="rounded-md border">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Name</TableHead>
														<TableHead className="text-center">Qty</TableHead>
														<TableHead className="text-right">Cost/Unit</TableHead>
														<TableHead className="text-right">Total</TableHead>
														{hasBrandOrSupplier && <TableHead>Brand</TableHead>}
														{hasBrandOrSupplier && <TableHead>Supplier</TableHead>}
														<TableHead>Remark</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{values.items.map((item: RequisitionItem, index: number) => (
														<TableRow key={index}>
															<TableCell>{item.name}</TableCell>
															<TableCell className="text-center">{item.quantity}</TableCell>
															<TableCell className="text-right">
																{formatCurrency(item.cost)}
															</TableCell>
															<TableCell className="text-right">
																{formatCurrency(item.totalCost)}
															</TableCell>
															{hasBrandOrSupplier && <TableCell>{item.brand || "-"}</TableCell>}
															{hasBrandOrSupplier && <TableCell>{item.supplier || "-"}</TableCell>}
															<TableCell>{item.remark}</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</div>
								)}

								{values.people_repair_will_benefit &&
									values.people_repair_will_benefit.length > 0 && (
										<div>
											<h4 className="mt-3 mb-1 text-base font-semibold">People Benefiting:</h4>
											<ul className="ml-4 list-inside list-disc">
												{values.people_repair_will_benefit.map((person, index: number) => (
													<li key={index}>{person.name}</li>
												))}
											</ul>
										</div>
									)}
								{values.notes && (
									<p className="mt-3">
										<strong>Notes:</strong> {values.notes}
									</p>
								)}
							</CardContent>
						</Card>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="approvals">
					<AccordionTrigger>Approval Status</AccordionTrigger>
					<AccordionContent>
						<Card>
							<CardContent className="pt-4 text-sm">
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-[30px]">#</TableHead>
												<TableHead>Role ID</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Comments</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{approvals.map((approval: Approval, index: number) => (
												<TableRow
													key={index}
													className={
														index === stage && approval.status === "PENDING"
															? "bg-blue-50 dark:bg-blue-900/30"
															: ""
													}
												>
													<TableCell>{index + 1}</TableCell>
													<TableCell className="max-w-[150px] truncate">
														{approval.approverRole}
													</TableCell>
													<TableCell>
														<Badge
															variant={
																approval.status === "PENDING"
																	? "default"
																	: approval.status === "APPROVED"
																		? "outline" // Consider a "success" variant
																		: approval.status === "REJECTED"
																			? "destructive"
																			: "secondary"
															}
														>
															{approval.status}
														</Badge>
													</TableCell>
													<TableCell>
														{approval.comments && approval.comments.length > 0 ? (
															approval.comments.join("; ")
														) : (
															<span className="text-muted-foreground">N/A</span>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="initiator">
					<AccordionTrigger>Initiator Details</AccordionTrigger>
					<AccordionContent>
						<Card>
							<CardContent className="space-y-1 pt-4 text-sm">
								<p>
									<strong>Name:</strong> {initiator.name}
								</p>
								<p>
									<strong>Email:</strong> {initiator.email}
								</p>
								<p>
									<strong>ID:</strong> {initiator.id}
								</p>
							</CardContent>
						</Card>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="business-unit">
					<AccordionTrigger>Business Unit</AccordionTrigger>
					<AccordionContent>
						<Card>
							<CardContent className="space-y-1 pt-4 text-sm">
								<p>
									<strong>Name:</strong> {fromBU.name}
								</p>
								<p>
									<strong>ID:</strong> {fromBU.id}
								</p>
							</CardContent>
						</Card>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
};

export default RequisitionDetails;
