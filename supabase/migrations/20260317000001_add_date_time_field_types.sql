-- Add date, time, and datetime to the field_type enum
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'date';
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'time';
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'datetime';
