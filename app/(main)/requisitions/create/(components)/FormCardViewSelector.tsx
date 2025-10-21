"use client";

import { useMemo } from "react";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { icons, CheckCircle } from "lucide-react";

interface FormCardViewSelectorProps {
  forms: Form[];
  selectedFormId: string | undefined;
  onSelectForm: (formId: string) => void;
  globalFilter: string;
}

export function FormCardViewSelector({
  forms,
  selectedFormId,
  onSelectForm,
  globalFilter,
}: FormCardViewSelectorProps) {
  const filteredForms = useMemo(() => {
    if (!globalFilter) return forms;
    const lowerCaseFilter = globalFilter.toLowerCase();
    return forms.filter(
      (form) =>
        form.name.toLowerCase().includes(lowerCaseFilter) ||
        (form.description &&
          form.description.toLowerCase().includes(lowerCaseFilter)) ||
        (form.workflowSteps &&
          form.workflowSteps.some((step) =>
            step.toLowerCase().includes(lowerCaseFilter),
          )),
    );
  }, [forms, globalFilter]);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredForms.length > 0 ? (
        filteredForms.map((form) => (
          <Card
            key={form.id}
            onClick={() => onSelectForm(form.id)}
            className={`flex cursor-pointer flex-col ${
              selectedFormId === form.id
                ? "border-emerald-500 ring-2 ring-emerald-500"
                : ""
            }`}
          >
            <CardHeader className="flex-grow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    if (form.icon && icons[form.icon as keyof typeof icons]) {
                      const IconComponent =
                        icons[form.icon as keyof typeof icons];
                      return (
                        <IconComponent className="h-6 w-6 text-emerald-500" />
                      );
                    }
                    if (form.icon) {
                      return <span className="text-2xl">{form.icon}</span>;
                    }
                    return null;
                  })()}
                  <CardTitle>{form.name}</CardTitle>
                </div>
                <Button
                  variant={selectedFormId === form.id ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card onClick from firing
                    onSelectForm(form.id);
                  }}
                >
                  {selectedFormId === form.id ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : null}
                  Select
                </Button>
              </div>
              <CardDescription className="line-clamp-2">
                {form.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{form.version}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.workflowSteps && form.workflowSteps.length > 0 ? (
                  form.workflowSteps.map((step, index) => (
                    <Badge key={index} variant="secondary">
                      {step}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No workflow
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground col-span-full text-center">
          No forms found.
        </p>
      )}
    </div>
  );
}
