-- Create RPC function to get forms waiting for the user to fill
-- These are forms from notifications where a previous section was completed

CREATE OR REPLACE FUNCTION "public"."get_my_pending_section_forms"()
RETURNS TABLE(
  "notification_id" "uuid",
  "message" "text",
  "link_url" "text",
  "created_at" timestamp with time zone,
  "parent_request_id" "uuid",
  "parent_form_name" "text",
  "parent_status" "text",
  "section_order" integer,
  "section_name" "text",
  "form_name" "text"
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id as notification_id,
    n.message,
    n.link_url,
    n.created_at,
    -- Extract parent_request ID from link_url
    NULLIF(
      regexp_replace(n.link_url, '.*parent_request=([a-f0-9-]+).*', '\1'),
      n.link_url
    )::uuid as parent_request_id,
    pf.name as parent_form_name,
    pr.status::text as parent_status,
    ws.section_order,
    ws.section_name,
    f.name as form_name
  FROM notifications n
  -- Extract workflow and section info from URL pattern
  -- /requests/create/{workflow_chain_id}/{section_order}/{template_id}/{bu_id}
  LEFT JOIN LATERAL (
    SELECT
      split_part(split_part(n.link_url, '/requests/create/', 2), '/', 1) as workflow_id,
      split_part(split_part(n.link_url, '/requests/create/', 2), '/', 2) as section_order_str,
      split_part(split_part(n.link_url, '/requests/create/', 2), '/', 3) as form_id
  ) url_parts ON true
  LEFT JOIN workflow_sections ws ON
    ws.chain_id::text = url_parts.workflow_id
    AND ws.section_order::text = url_parts.section_order_str
  LEFT JOIN forms f ON f.id::text = url_parts.form_id
  -- Get parent request info
  LEFT JOIN LATERAL (
    SELECT id, form_id, status
    FROM requests
    WHERE id::text = regexp_replace(n.link_url, '.*parent_request=([a-f0-9-]+).*', '\1')
    LIMIT 1
  ) pr ON n.link_url LIKE '%parent_request=%'
  LEFT JOIN forms pf ON pf.id = pr.form_id
  WHERE n.recipient_id = auth.uid()
    AND NOT n.is_read
    AND n.link_url LIKE '/requests/create/%'
    AND n.link_url LIKE '%parent_request=%'
  ORDER BY n.created_at DESC;
END;
$$;

COMMENT ON FUNCTION "public"."get_my_pending_section_forms"()
IS 'Get unread notifications for pending section forms that need to be filled. These are forms where a previous section was completed and the user needs to fill the next section. Used for dashboard call-to-action table.';
