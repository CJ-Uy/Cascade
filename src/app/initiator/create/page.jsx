"use client";

import { DashboardHeader } from "@/components/dashboardHeader";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
const FormSchema = z.object({
	username: z.string().min(2, {
		message: "Username must be at least 2 characters.",
	}),
});

export default function Create() {
	
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Create Requisition" />
				<div className="flex w-[80%] flex-col">

				</div>
			</div>
		</>
	);
}
