-- Migration: Fix RLS policies for attachments table
-- Date: 2026-01-06
-- Description: Add proper RLS policies to allow authenticated users to create and manage attachments

-- Enable RLS on attachments table if not already enabled
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own attachments" ON attachments;
DROP POLICY IF EXISTS "Users can view attachments" ON attachments;
DROP POLICY IF EXISTS "Users can update their own attachments" ON attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON attachments;

-- Policy: Authenticated users can insert attachments they upload
CREATE POLICY "Users can insert their own attachments"
ON attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploader_id);

-- Policy: Users can view attachments
-- Anyone can view attachments (since comments are visible to request participants)
CREATE POLICY "Users can view attachments"
ON attachments FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can update their own attachments
CREATE POLICY "Users can update their own attachments"
ON attachments FOR UPDATE
TO authenticated
USING (auth.uid() = uploader_id)
WITH CHECK (auth.uid() = uploader_id);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON attachments FOR DELETE
TO authenticated
USING (auth.uid() = uploader_id);
