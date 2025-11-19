export type ArrayFieldDefault = [
  Record<string, any>, // The sample item object
  string[], // The array of keys for order
];

export interface TemplateValue {
  title: string;
  // Default can be a string, OR our new ArrayFieldDefault structure,
  // OR a simple array of objects (if no order is specified, for backward compatibility or simpler cases)
  default: string | ArrayFieldDefault | Record<string, any>[];
  optional: boolean;
  // No itemFieldOrder at this level anymore
}

export interface Template {
  values: TemplateValue[];
}

export interface TemplatesData {
  [key: string]: Template;
}

export interface InferredItemField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
  defaultValue: string | number | boolean;
}
