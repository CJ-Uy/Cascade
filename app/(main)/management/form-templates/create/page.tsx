import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getBusinessUnitOptions } from "@/app/(main)/management/business-units/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTemplate } from "./actions";

const CreateTemplatePage = async () => {
  const authContext = await getUserAuthContext();
  const businessUnits = await getBusinessUnitOptions();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">
          You do not have permission to perform this action.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/management/form-templates">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Create New Form Template</CardTitle>
          <CardDescription>
            Start by defining the basic details of your new template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTemplate} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., IT Service Request"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the purpose of this form."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="business_unit_id">Business Unit</Label>
              <Select name="business_unit_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select a Business Unit (or leave for Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (All BUs)</SelectItem>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create and Continue</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTemplatePage;
