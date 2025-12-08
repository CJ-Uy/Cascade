-- Add a JSONB column to store field configuration (for grid-table and other complex field types)
ALTER TABLE "public"."template_fields"
ADD COLUMN IF NOT EXISTS "field_config" jsonb;

COMMENT ON COLUMN "public"."template_fields"."field_config" IS 'Stores configuration for complex field types like grid-table (rows, columns, cellConfig)';
