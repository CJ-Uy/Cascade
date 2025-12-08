-- Remove the unique constraint on field labels within a template
-- This allows multiple fields with the same label in the same form

ALTER TABLE "public"."template_fields"
DROP CONSTRAINT IF EXISTS "template_fields_template_id_label_parent_list_field_id_key";

COMMENT ON TABLE "public"."template_fields" IS 'Form fields can now have duplicate labels within the same template (e.g., multiple "name" fields)';
