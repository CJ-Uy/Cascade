// app/(main)/documents/create/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Building, Globe } from "lucide-react";

async function getTemplates() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_form_templates_for_user");
  if (error) {
    console.error("Error fetching form templates:", error);
    return [];
  }
  return data;
}

export default async function CreateDocumentPage() {
  const templates = await getTemplates();

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Create a New Document
        </h1>
        <p className="text-muted-foreground">Select a template to begin.</p>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="mb-2 flex items-center space-x-3">
                  {template.is_locked ? (
                    <Globe className="text-primary h-5 w-5" />
                  ) : (
                    <Building className="text-muted-foreground h-5 w-5" />
                  )}
                  <CardTitle>{template.name}</CardTitle>
                </div>
                <CardDescription>
                  {template.description || "No description available."}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link
                  href={`/documents/create/${template.id}`}
                  className="w-full"
                >
                  <Button className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No form templates available
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            There are no form templates available for you to use.
          </p>
        </div>
      )}
    </div>
  );
}
