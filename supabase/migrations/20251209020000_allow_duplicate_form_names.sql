-- Remove the unique constraint on form names within a business unit
-- This allows multiple forms with the same name in the same business unit

ALTER TABLE "public"."requisition_templates"
DROP CONSTRAINT IF EXISTS "requisition_templates_name_business_unit_id_key";

COMMENT ON TABLE "public"."requisition_templates" IS 'Form templates can now have duplicate names within the same business unit';
