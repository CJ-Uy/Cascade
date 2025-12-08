-- Add 'repeater' and 'grid-table' to the field_type enum
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'repeater';
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'grid-table';
