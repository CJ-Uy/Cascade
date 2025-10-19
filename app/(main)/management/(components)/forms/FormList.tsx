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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Users,
  icons,
} from "lucide-react";

// Define the structure of a Form, which can be reused
export interface Form {
  id: string;
  name: string;
  description: string;
  icon?: string;
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
                {(() => {
                  if (form.icon && icons[form.icon as keyof typeof icons]) {
                    const IconComponent =
                      icons[form.icon as keyof typeof icons];
                    return (
                      <IconComponent className="mr-3 h-6 w-6 text-emerald-500" />
                    );
                  }
                  if (form.icon) {
                    return <span className="mr-3 text-2xl">{form.icon}</span>;
                  }
                  return <FileText className="mr-3 h-6 w-6 text-emerald-500" />;
                })()}
                {form.name}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPreview(form)}>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Preview</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(form)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
