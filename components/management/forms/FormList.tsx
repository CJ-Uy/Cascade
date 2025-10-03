"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, FileText, Users } from "lucide-react";

// Define the structure of a Form, which can be reused
export interface Form {
  id: string;
  name: string;
  description: string;
  fields: any[]; // Replace 'any' with a proper Field type later
  accessRoles: string[];
}

interface FormListProps {
  forms: Form[];
  onEdit: (form: Form) => void;
  onPreview: (form: Form) => void;
}

export function FormList({ forms, onEdit, onPreview }: FormListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {forms.map((form) => (
        <Card key={form.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <span className="flex items-center">
                <FileText className="mr-3 h-6 w-6 text-emerald-500" />
                {form.name}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPreview(form)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(form)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>{form.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-4">
              <h4 className="mb-2 flex items-center text-sm font-semibold">
                <span className="text-muted-foreground">
                  {form.fields.length} Fields
                </span>
              </h4>
            </div>
            <div>
              <h4 className="mb-2 flex items-center text-sm font-semibold">
                <Users className="text-muted-foreground mr-2 h-4 w-4" />
                Has Access
              </h4>
              <div className="flex flex-wrap gap-2">
                {form.accessRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
