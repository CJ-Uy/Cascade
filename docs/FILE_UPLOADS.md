# File Upload System

**Last Updated:** 2026-01-06

Complete guide to file upload patterns in the Cascade application.

## Overview

Cascade supports file uploads in three contexts:
1. **Form file uploads** - Files attached to request form fields
2. **Comment attachments** - Files attached to comments
3. **Chat attachments** - Files sent in chat messages

All files are stored in Supabase Storage and referenced via the `attachments` table or stored as metadata in JSONB fields.

---

## Form File Uploads

### Architecture

Form file uploads use a **metadata storage pattern** to avoid JSONB serialization issues:

1. User selects file in form field
2. File **immediately uploads** to Supabase Storage
3. **Metadata object** (not File object) stored in form data
4. On request detail view, files fetched from storage using metadata

### Implementation

#### Server Action

**File:** `app/(main)/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]/form-file-upload.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadFormFile(formData: FormData): Promise<{
  success: boolean;
  fileData: {
    filename: string;
    storage_path: string;
    filetype: string;
    size_bytes: number;
  } | null;
  error: string | null;
  warning?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, fileData: null, error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, fileData: null, error: "No file provided" };
  }

  // Warn for large files (25MB+) but still allow upload
  const isLargeFile = file.size > 25 * 1024 * 1024;

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `form-uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file);

  if (uploadError) {
    return { success: false, fileData: null, error: uploadError.message };
  }

  return {
    success: true,
    fileData: {
      filename: file.name,
      storage_path: filePath,
      filetype: file.type,
      size_bytes: file.size,
    },
    error: null,
    warning: isLargeFile
      ? "Large file uploaded. Files over 25MB may take longer to load."
      : undefined,
  };
}
```

#### FormFiller Component

**File:** `app/(main)/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]/(components)/FormFiller.tsx`

**Handle file upload:**

```typescript
const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());

const handleFileUpload = async (fieldKey: string, file: File | null) => {
  if (!file) return;

  // Track upload in progress
  setUploadingFields((prev) => new Set(prev).add(fieldKey));

  const formData = new FormData();
  formData.append("file", file);

  const result = await uploadFormFile(formData);

  // Remove from uploading set
  setUploadingFields((prev) => {
    const next = new Set(prev);
    next.delete(fieldKey);
    return next;
  });

  if (result.success && result.fileData) {
    // Store metadata, NOT File object
    handleValueChange(fieldKey, result.fileData);

    if (result.warning) {
      toast.warning(result.warning);
    }
  } else {
    toast.error(result.error || "Failed to upload file");
  }
};

const handleFileRemove = (fieldKey: string) => {
  handleValueChange(fieldKey, null);
};
```

**Render file upload field:**

```typescript
case "file-upload": {
  const fileMetadata = values[field.field_key];
  const isUploading = uploadingFields.has(field.field_key);

  return (
    <div>
      <Label>{field.field_label}</Label>
      {fileMetadata?.filename ? (
        <div className="flex items-center gap-2">
          {/* Image preview for image files */}
          {fileMetadata.filetype?.startsWith("image/") && (
            <img
              src={URL.createObjectURL(/* fetch from storage */)}
              alt={fileMetadata.filename}
              className="h-20 w-20 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{fileMetadata.filename}</p>
            <p className="text-xs text-muted-foreground">
              {(fileMetadata.size_bytes / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFileRemove(field.field_key)}
          >
            Remove
          </Button>
        </div>
      ) : (
        <Input
          type="file"
          disabled={isUploading}
          onChange={(e) =>
            e.target.files?.[0] &&
            handleFileUpload(field.field_key, e.target.files[0])
          }
        />
      )}
      {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
    </div>
  );
}
```

#### FieldRenderer Component

**File:** `app/(main)/requests/[id]/(components)/FieldRenderer.tsx`

**Render uploaded file in request detail view:**

```typescript
case "file-upload": {
  const fileData = value; // Metadata object from JSONB

  if (!fileData?.storage_path || !fileData?.filename) {
    return <p className="text-sm text-muted-foreground">No file uploaded</p>;
  }

  const supabase = createClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from("attachments").getPublicUrl(fileData.storage_path);

  const isImage = fileData.filetype?.startsWith("image/");

  return (
    <div>
      {isImage ? (
        <img
          src={publicUrl}
          alt={fileData.filename}
          className="max-h-64 rounded border"
        />
      ) : (
        <a
          href={publicUrl}
          download={fileData.filename}
          className="text-blue-600 hover:underline"
        >
          {fileData.filename}
        </a>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {(fileData.size_bytes / 1024).toFixed(1)} KB
      </p>
    </div>
  );
}
```

### Metadata Schema

Files are stored as JSONB objects with this structure:

```typescript
interface FileMetadata {
  filename: string; // Original filename (e.g., "report.pdf")
  storage_path: string; // Path in Supabase Storage (e.g., "form-uploads/uuid-timestamp.pdf")
  filetype: string; // MIME type (e.g., "application/pdf", "image/png")
  size_bytes: number; // File size in bytes
}
```

### Storage Organization

**Bucket:** `attachments`

**Path Structure:**

```
attachments/
├── form-uploads/          # Form file uploads
│   ├── {userId}-{timestamp}.{ext}
│   └── ...
├── comment-attachments/   # Comment attachments (legacy)
│   └── ...
└── chat-attachments/      # Chat message files (legacy)
    └── ...
```

### Key Decisions

1. **Why metadata instead of File objects?**
   - File objects cannot be serialized to JSON/JSONB
   - Storing metadata allows proper database storage
   - Files remain accessible via Supabase Storage URLs

2. **Why upload immediately?**
   - Avoids holding File objects in memory
   - Provides instant feedback to user
   - Simplifies form submission (no multipart handling)

3. **Why warn at 25MB?**
   - Balance between usability and performance
   - Large files can slow down page loads
   - Warning allows user to reconsider without blocking

---

## Comment Attachments

### Architecture

Comments use the **attachments table** pattern:

1. User selects file
2. File uploads to Supabase Storage
3. Record created in `attachments` table
4. Attachment linked to comment via foreign key

### Database Schema

**Table:** `attachments`

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  filetype TEXT,
  size_bytes BIGINT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Links to parent resources
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  chat_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE
);
```

### Server Action

**File:** `app/(main)/requests/[id]/actions.ts`

```typescript
"use server";

export async function uploadCommentAttachment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  const commentId = formData.get("commentId") as string;

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `comment-attachments/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file);

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // Create attachment record
  const { error: dbError } = await supabase.from("attachments").insert({
    filename: file.name,
    storage_path: filePath,
    filetype: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
    comment_id: commentId,
  });

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  return { success: true };
}
```

### Component Usage

**Fetch attachments with comment:**

```typescript
const { data: comments } = await supabase
  .from("comments")
  .select(`
    *,
    attachments (*)
  `)
  .eq("request_id", requestId);
```

**Render attachments:**

```typescript
{comment.attachments?.map((attachment) => (
  <a
    key={attachment.id}
    href={getPublicUrl(attachment.storage_path)}
    download={attachment.filename}
    className="text-blue-600 hover:underline"
  >
    {attachment.filename}
  </a>
))}
```

---

## Chat Attachments

Chat attachments follow the same pattern as comment attachments, using the `attachments` table with `chat_message_id` foreign key.

See [Chat System](#) section in CLAUDE.md for full implementation details.

---

## Storage Bucket Configuration

### Bucket Settings

**Name:** `attachments`

**Public Access:** Enabled (for easy file retrieval)

**File Size Limit:** None (handled at application level)

**Allowed MIME Types:** All (validation at application level)

### RLS Policies

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow public read access
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Best Practices

### 1. File Size Warnings

```typescript
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

if (file.size > MAX_FILE_SIZE) {
  toast.warning("Large file detected. Upload may take longer.");
}
```

### 2. File Type Validation

```typescript
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

if (!ALLOWED_TYPES.includes(file.type)) {
  return { success: false, error: "File type not allowed" };
}
```

### 3. Unique Filenames

```typescript
// Always use user ID and timestamp to prevent collisions
const fileName = `${userId}-${Date.now()}.${fileExtension}`;
```

### 4. Error Handling

```typescript
try {
  const result = await uploadFormFile(formData);
  if (!result.success) {
    toast.error(result.error || "Upload failed");
  }
} catch (error) {
  toast.error("An unexpected error occurred");
}
```

### 5. Loading States

```typescript
const [uploading, setUploading] = useState(false);

const handleUpload = async (file: File) => {
  setUploading(true);
  try {
    await uploadFile(file);
  } finally {
    setUploading(false);
  }
};
```

---

## Common Issues

### Issue: File object in JSONB

**Error:** `File object cannot be serialized to JSON`

**Solution:** Upload file to storage first, store metadata object instead:

```typescript
// ❌ BAD - Don't store File objects
handleValueChange(fieldKey, file);

// ✅ GOOD - Store metadata
const metadata = {
  filename: file.name,
  storage_path: "path/to/file",
  filetype: file.type,
  size_bytes: file.size
};
handleValueChange(fieldKey, metadata);
```

### Issue: Files not displaying

**Cause:** File metadata missing or malformed

**Check:**
1. Metadata has `storage_path` and `filename`
2. File exists in Supabase Storage
3. Public URL generation works
4. File type detection logic is correct

### Issue: Upload fails silently

**Cause:** No error handling

**Solution:** Always handle errors and show user feedback:

```typescript
const result = await uploadFormFile(formData);
if (result.error) {
  toast.error(result.error);
} else if (result.warning) {
  toast.warning(result.warning);
} else {
  toast.success("File uploaded successfully");
}
```

---

## Migration Guide

### Migrating from File Objects to Metadata

If you have existing code storing File objects:

1. **Update upload handler:**
   ```typescript
   // Before
   onChange={(e) => setValue(e.target.files[0])}

   // After
   onChange={(e) => handleFileUpload(fieldKey, e.target.files[0])}
   ```

2. **Update server action:**
   ```typescript
   // Upload file and return metadata
   const metadata = {
     filename: file.name,
     storage_path: filePath,
     filetype: file.type,
     size_bytes: file.size
   };
   return { success: true, fileData: metadata };
   ```

3. **Update field renderer:**
   ```typescript
   // Before
   <img src={value} />

   // After
   const publicUrl = getPublicUrl(value.storage_path);
   <img src={publicUrl} alt={value.filename} />
   ```

---

## Testing Checklist

- [ ] File uploads to Supabase Storage successfully
- [ ] Metadata stored correctly in JSONB
- [ ] File displays in request detail view
- [ ] Image previews work
- [ ] Non-image files show download links
- [ ] Large file warning appears (>25MB)
- [ ] Upload progress indicator shown
- [ ] Error states display correctly
- [ ] File removal works
- [ ] Multiple file uploads in same form work

---

**Last Updated:** 2026-01-06
**Version:** 1.0.0
