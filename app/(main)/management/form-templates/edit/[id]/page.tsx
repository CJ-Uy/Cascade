import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getTemplateDetails } from "./actions";
import { Button } from "@/components/ui/button";
import { FormBuilder } from "./(components)/form-builder";

interface PageProps {
  params: { id: string };
}

const EditTemplatePage = async ({ params }: PageProps) => {
  const authContext = await getUserAuthContext();
  const template = await getTemplateDetails(params.id);

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">
          Template not found
        </h1>
        <p className="mt-2">The requested template does not exist.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/management/form-templates">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <FormBuilder initialTemplate={template} />
    </div>
  );
};

export default EditTemplatePage;
