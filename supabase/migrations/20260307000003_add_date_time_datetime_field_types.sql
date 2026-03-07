-- Add date, time, and datetime values to the field_type enum
-- These enable date picker, time picker, and date+time picker form fields

ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'date';
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'time';
ALTER TYPE "public"."field_type" ADD VALUE IF NOT EXISTS 'datetime';
