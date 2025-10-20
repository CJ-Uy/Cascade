-- Add created_at field to chat_participants table
ALTER TABLE "public"."chat_participants" 
ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

-- Update existing records to have a created_at timestamp
UPDATE "public"."chat_participants" 
SET "created_at" = now() 
WHERE "created_at" IS NULL;

