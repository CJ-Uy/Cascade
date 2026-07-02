# Agila Cloudflare Migration Plan

Last updated: 2026-06-28

## Executive Summary

Move Agila from Next.js + Supabase to Cloudflare Workers + D1 + R2 + Drizzle in stages.

Recommended path:

1. Deploy the existing Next.js app to Cloudflare Workers with OpenNext.
2. Move Supabase Storage to R2.
3. Replace Supabase Auth with Better Auth on D1.
4. Move Supabase Postgres/RPC/RLS logic into TypeScript services backed by D1 + Drizzle.
5. Replace Supabase Realtime chat with Durable Objects WebSockets.
6. Add append-only, tamper-evident audit logging for every meaningful action.
7. Cut over after a dry-run migration and rollback rehearsal.

Do not do a one-shot rewrite. The hard part is not D1 or R2. The hard part is replacing Supabase Auth, RLS, RPC functions, storage rules, and realtime behavior without changing product behavior.

Non-goals for the first migration:

- No redesign.
- No new workflow engine.
- No broad component refactor.
- No generic repository framework.
- No new auth requirements beyond username/password, sessions, admin reset, and invitation flows.

Default decisions unless explicitly changed:

- Login uses username + password.
- Email is still stored for invitations and password recovery.
- Migrated users reset passwords on first login.
- Private attachments are never served by public R2 URLs.
- Chat uses Durable Objects WebSockets from the first Cloudflare-native version.
- Audit logs are app-append-only, hash-linked, and exported to R2 daily.

Phase 1 spike findings:

- OpenNext Cloudflare build works for this repo.
- Use `next build --webpack` for Cloudflare builds. Turbopack produced chunk-load failures in local Windows preview.
- Remote Cloudflare preview works.
- D1 and R2 bindings are accessible from Next route handlers through `getCloudflareContext()`.
- Actual remote D1 writes and R2 write/read/delete succeeded through smoke route.
- `wrangler.toml` needs explicit `account_id` because this machine has multiple Cloudflare accounts.
- Supabase still runs during Phase 1; this does not prove Better Auth, D1 schema migration, or Supabase login submission yet.

Current beta state:

- Worker: `agila-cf-beta`.
- Custom domain: `https://agila-cf-beta.cjuy.dev`.
- Beta D1 database: `agila-cf-beta-db`, id `ffab6b1d-06ea-48c0-aeaa-936f22020967`.
- Beta R2 bucket: `agila-cf-beta-storage`.
- Supabase public-table mirror imported to D1: 24 tables, 844 rows, count-verified after import.
- Supabase Storage mirror uploaded to R2: 10 objects from `avatars`, `attachments`, and `requisition_attachments`.
- The deployed beta app still uses Supabase for product behavior. The D1/R2 mirror is a verified migration artifact, not yet the app source of truth.

## Current System Inventory

Agila currently uses:

- Next.js App Router, React 19, Server Components, Server Actions, API routes.
- Supabase Postgres for relational data.
- Supabase Auth for users, cookies, password flows, admin user creation, and password resets.
- Supabase RLS and RPC functions for authorization-heavy reads and workflow mutations.
- Supabase Storage for avatars and attachments.
- Supabase Realtime for chat subscriptions.

Observed repo facts:

- 24 database tables in Supabase migrations.
- 18 Postgres enums.
- 89 SQL functions/RPCs.
- 82 RLS policies.
- 19 `actions.ts` files.
- 10 API route files.
- Storage buckets in use: `avatars`, `attachments`, `requisition_attachments`.
- Realtime tables: `chats`, `chat_participants`, `chat_messages`.

Core product areas:

- Organizations and business units.
- Users, roles, memberships, and permission scopes.
- Dynamic forms and form fields.
- Workflow chains, sections, initiators, and approval steps.
- Requests, request history, comments, tags, and attachments.
- Notifications.
- Real-time chat.
- Auditor views and compliance/audit trails.

## Target Architecture

### Runtime

Use Cloudflare Workers with the OpenNext Cloudflare adapter.

Keep the Next.js app. Do not rewrite to a raw Worker or Hono app unless OpenNext blocks a required feature.

Required pieces:

- `@opennextjs/cloudflare`
- `wrangler`
- `open-next.config.ts`
- `wrangler.toml`
- `nodejs_compat`
- Workers Assets binding
- generated Cloudflare env types
- one documented way to access bindings from Next/OpenNext server code

Runtime risk to check early: any code that assumes a normal Node server, local disk writes, long-lived process memory, or Docker-only behavior must be removed or isolated.

### Database

Use Cloudflare D1 with Drizzle ORM.

Use Drizzle for:

- schema definitions
- typed queries
- migrations
- query composition

Use D1 directly only where Drizzle makes a query uglier than plain SQL.

Use one D1 database for app data and auth at first. This keeps user/profile/session mutations simple. Add a separate reporting database or export pipeline later only if reporting load or compliance policy demands it.

### Files

Use R2 for all user-uploaded files.

Buckets:

- `agila-avatars`
- `agila-attachments`
- `agila-public`
- optional `agila-migration` for migration imports/exports

Attachment access should go through application routes that check permissions before streaming R2 objects. Avoid public URLs for private request documents.

### Auth

Use Better Auth on D1.

This is what "Cloudflare native auth" should mean for this app: auth runs inside our Cloudflare Worker, stores users/sessions in D1, uses Worker cookies, and does not depend on Supabase.

Better Auth fits because the client only needs basic username/password. Use:

- email/password enabled
- username plugin for username login
- email stored for invitations and password reset, unless the client explicitly wants admin-only resets
- Agila-owned admin flows for create/reset/delete unless Better Auth admin plugin cleanly covers the exact need
- D1 database integration

Keep product permissions outside Better Auth. Better Auth should authenticate identity. Agila code should authorize actions using roles, business units, organizations, and workflow rules.

Default auth decision: username + password for login, email retained for recovery and invites. If the client truly wants no email, password recovery becomes admin-reset only.

Do not use Cloudflare Access for Agila customer login. Access is good for protecting internal/admin tools, not replacing application username/password auth for this product.

### Real-Time Chat

Use Durable Objects with hibernatable WebSockets.

Design:

- One Durable Object instance per chat room.
- WebSocket connect path validates the user's session and chat membership.
- Message send flow writes to D1 first, then broadcasts through the chat Durable Object.
- D1 remains source of truth.
- Durable Object is transport/coordination only.
- On reconnect, client fetches missed messages from D1.

This avoids losing messages if a WebSocket dies and keeps audit/compliance queries simple.

### Audit Logging

Use an append-only `audit_events` table in D1.

"Append-only" means the application never updates or deletes audit rows. It is not legal-grade immutability: anyone with direct database admin access can still alter data. For stronger evidence, add hash chaining and scheduled R2 exports.

Record every meaningful action:

- auth events: login, logout, failed login, password reset, account creation, account deletion
- organization changes
- business unit changes
- role/membership changes
- form create/update/archive/delete/restore
- workflow create/update/archive/delete/restore/activate
- request draft/save/submit/approve/reject/send back/clarification/cancel
- comments and attachments
- tag changes
- notification creation/read
- chat create/member changes/message delete if supported
- admin access to sensitive records

Each event should include:

- `id`
- `occurred_at`
- `event_hash`
- `previous_event_hash`
- `actor_user_id`
- `actor_session_id`
- `actor_ip`
- `actor_user_agent`
- `organization_id`
- `business_unit_id`
- `entity_type`
- `entity_id`
- `action`
- `before_json`
- `after_json`
- `metadata_json`
- `request_id` or trace id

Do not let normal app flows update or delete audit events. For corrections, append another event. For high-risk actions, write the domain mutation and audit event in the same transaction where D1 supports the needed shape; otherwise fail closed and surface the error.

## Migration Principles

1. Keep behavior stable before changing infrastructure.
2. Put Supabase behind local wrappers before replacing it.
3. Port one product area at a time.
4. Treat authorization as the main migration, not an afterthought.
5. Make D1 the source of truth only after import checks pass.
6. Make rollback boring: Supabase stays read-only until the new system proves stable.

## Phase 1: Deploy Current App To Workers

Goal: prove the app can run on Cloudflare Workers while still using Supabase.

Status after spike: partially proven.

Proven:

- OpenNext build succeeds with `next build --webpack`.
- Remote Cloudflare preview serves the app.
- Public root page returns `200`.
- D1 and R2 bindings work from a Next route handler.
- Remote D1 received smoke rows.
- Remote R2 write/read/delete succeeded.

Not proven yet:

- Supabase login form submission.
- Protected dashboard after login.
- Server Actions that call Supabase.
- One full request approval flow.
- Production deploy.

Tasks:

- Add OpenNext Cloudflare adapter.
- Add Wrangler config.
- Create throwaway/staging D1 and R2 bindings for runtime proof.
- Remove Docker-only `output: "standalone"` from Cloudflare build path.
- Add scripts:
  - `cf:preview`
  - `cf:deploy`
  - `cf:typegen`
- Set compatibility date and `nodejs_compat`.
- Generate Cloudflare env types.
- Verify binding access from API routes, then from one Server Action.
- Confirm Server Actions, middleware, API routes, and static assets work.

Acceptance checks:

- Public landing page loads.
- Login page loads.
- Protected routes redirect when logged out.
- Existing Supabase login works.
- Dashboard loads for a test user.
- One request approval flow works.

Rollback:

- Docker/Coolify deployment has been removed after the Workers path was verified.

## Phase 2: Add Local Service Boundaries

Goal: stop application code from talking to Supabase everywhere.

Add minimal modules:

- `lib/auth/session.ts`
- `lib/db/client.ts`
- `lib/files/storage.ts`
- `lib/audit/log.ts`

Do not build a large repository framework. Add functions only for real current calls.

Before editing each feature, inventory its current Supabase calls and RPCs. Port the flow, not the file tree.

Examples:

- `getCurrentUser()`
- `requireUser()`
- `getUserAuthContext(userId)`
- `uploadAttachment(...)`
- `getAttachmentDownload(...)`
- `recordAuditEvent(...)`

Acceptance checks:

- New code paths use wrappers.
- No behavior change.
- Existing Supabase implementation remains underneath.

## Phase 3: Move Storage To R2

Goal: remove Supabase Storage dependency first because it is isolated.

Tasks:

- Create R2 buckets.
- Add R2 bindings in Wrangler.
- Replace upload logic for avatars and attachments.
- Store R2 key in existing attachment/profile fields during transition.
- Create checked download routes for private files.
- Create migration script from Supabase Storage to R2.
- Enforce max file size, allowed MIME types, and safe filenames at upload.

Access model:

- Avatars can be public only if the client accepts that profile images are public.
- Request/comment/chat attachments require permission checks.
- R2 object key should include tenant scope: `{organizationId}/{businessUnitId}/{entityId}/{uuid}-{safeFileName}`.

Acceptance checks:

- Avatar upload and display work.
- Request attachment upload and download work.
- Comment attachment upload and delete work.
- Unauthorized user cannot download another BU's private attachment.

## Phase 4: Replace Supabase Auth With Better Auth

Goal: use basic username/password auth fully owned by the app.

Tasks:

- Add Better Auth.
- Configure D1-backed auth tables.
- Enable email/password.
- Add username plugin.
- Wire auth route handlers into Next/OpenNext.
- Replace Supabase cookie/session lookup.
- Port signup/login/logout/password reset pages.
- Port admin account creation/reset/delete flows.
- Add Turnstile to public login/signup/reset forms. Disable only if the app is deployed behind private access controls.
- Keep existing Agila `profiles`, roles, and memberships as product data.

Important decision:

- Authentication tables can be Better Auth managed.
- Product profile/permission tables stay Agila managed.
- Link them by stable user id.

Acceptance checks:

- User can sign up.
- User can log in with username/password or email/password, based on final choice.
- Session persists across reload.
- Middleware protects private routes.
- Admin can create/reset/delete users.
- Existing role checks still work.

Migration:

- Export Supabase auth users and profiles.
- Preserve user ids if possible.
- Default to forced password reset for migrated users unless a verified Better Auth-compatible hash migration path exists.

## Phase 5: Build D1 + Drizzle Schema

Goal: create D1 schema equivalent to current product schema.

Mapping rules:

- Postgres `uuid` -> SQLite `text`, generated by `crypto.randomUUID()`.
- Postgres enums -> `text` columns with app validation and selective `CHECK` constraints.
- Postgres `jsonb` -> JSON text with `json_valid` checks where useful. Parse/stringify at the data layer.
- Postgres `timestamptz` -> integer milliseconds or ISO text. Prefer integer milliseconds for Better Auth alignment and sorting.
- Postgres arrays -> JSON text or join tables.
- SQL triggers -> app code, except simple timestamp triggers if useful.
- RLS -> TypeScript authorization functions.
- Postgres stored procedures -> TypeScript services with explicit tests for permission-sensitive branches.

Drizzle files:

- `db/schema.ts`
- `db/client.ts`
- `drizzle.config.ts`
- `drizzle/` migrations folder

Wrangler D1 config should use `migrations_pattern` if Drizzle emits nested migration files.

Add a schema mapping document during this phase. Every old table, enum, trigger, function, and policy gets one status: ported, replaced, deleted, or intentionally deferred.

Acceptance checks:

- Fresh D1 database migrates from zero.
- Drizzle typecheck passes.
- Seed data can create one org, BU, user, role, form, workflow, request.

## Phase 6: Port Authorization And RPC Logic

Goal: replace RLS/RPC with explicit TypeScript authorization and service functions.

Port shared authorization first:

- `getUserAuthContext(userId)`
- `isSuperAdmin(userId)`
- `isOrganizationAdmin(userId, organizationId)`
- `isBuAdmin(userId, businessUnitId)`
- `canManageBu(userId, businessUnitId)`
- `canViewRequest(userId, requestId)`
- `canActOnApproval(userId, requestId)`
- `canViewChat(userId, chatId)`
- `canDownloadAttachment(userId, attachmentId)`

Then port product services in this order:

1. session/auth context
2. organizations/business units
3. users/roles/memberships
4. forms/form fields
5. workflows
6. request create/view/history
7. approvals/actions
8. auditor views/tags
9. notifications
10. chat

Each mutation should:

1. load actor session
2. check permission
3. validate input
4. write domain data
5. append audit event
6. return typed result

Acceptance checks:

- Every old RPC has either a replacement function or a documented deletion.
- Permission tests exist for high-risk access paths.
- No route trusts client-sent org/BU/user ids without checking membership.

## Phase 7: Implement Durable Object Real-Time Chat

Goal: preserve real-time chat.

Architecture:

- `ChatRoomDurableObject`
- Durable Object id derived from `chatId`
- `/api/chat/:id/ws` upgrades to WebSocket
- session checked before upgrade
- membership checked before upgrade
- message writes use service function
- service function records audit event
- Durable Object broadcasts accepted message to connected users
- Durable Object code must stay Worker-safe and must not import Next-only modules.

Message send flow:

1. Client sends message over WebSocket.
2. Durable Object validates socket attachment/session state.
3. Durable Object writes through a Worker-safe chat service.
4. Message persists to D1.
5. Audit event persists to D1.
6. Durable Object broadcasts message payload.
7. Client fetches missed messages on reconnect.

Acceptance checks:

- Two users in same chat see messages live.
- Non-member cannot connect to chat socket.
- Message persists after refresh.
- Reconnect fetches missed messages.
- D1 contains audit record for message creation.

## Phase 8: Add Audit Trail Everywhere

Goal: satisfy "record everything that happens and who did what."

Tasks:

- Create `audit_events` table.
- Add `recordAuditEvent()`.
- Add request trace id middleware/helper.
- Add audit calls to all high-risk mutations.
- Add an admin/auditor audit export endpoint in v1. A full audit-search UI can follow after cutover.
- Add scheduled export of audit events to R2 as newline-delimited JSON.

Minimum audited actions:

- auth/login/security events
- user admin events
- role and membership events
- organization and BU events
- form/workflow lifecycle
- request lifecycle
- approval decisions
- comments and attachments
- tag changes
- chat membership and messages
- failed permission checks on sensitive routes

Acceptance checks:

- Approving a request creates domain rows and audit rows.
- Changing a user role creates audit row with before/after.
- Uploading/deleting attachment creates audit row.
- Failed authorization on sensitive routes creates security audit event.
- Daily audit export appears in R2 and contains hash-linked events.
- Admin/auditor can export audit events by date range.

## Phase 9: Data Migration

Goal: copy production data into D1 safely.

Steps:

1. Export Supabase tables to NDJSON or CSV.
2. Export Supabase Storage objects.
3. Transform Postgres types to D1 types.
4. Import into staging D1.
5. Copy files to staging R2.
6. Run count checks.
7. Run relationship checks.
8. Run sample business workflow checks.
9. Write a migration manifest with source row counts, target row counts, file counts, checksums, script version, export time, import time, and operator.
10. Repeat until deterministic.

Run the full migration at least twice before production cutover. A migration that only worked once is not a migration plan.

Suggested import order:

1. users/auth/profiles
2. organizations
3. business_units
4. roles
5. user_business_units
6. user_role_assignments
7. forms
8. form_fields
9. workflow_chains
10. workflow_sections
11. workflow_section_initiators
12. workflow_section_steps
13. requests
14. request_history
15. comments
16. tags and request/document tag joins
17. attachments metadata
18. notifications
19. chats
20. chat_participants
21. chat_messages
22. audit event backfill, if any

Checks:

- row counts match
- foreign key orphan count is zero
- auth/profile id mapping is complete
- every migrated user can either log in or has a reset-required flag
- random request detail pages match old system
- random approval queues match old system
- random auditor views match old system
- all referenced attachment keys exist in R2
- migration manifest is saved in repo artifacts or R2 migration bucket

## Phase 10: Cutover

Goal: switch production with rollback.

Before cutover:

- staging Cloudflare deployment passes smoke tests
- staging D1 import passes checks
- R2 copy passes checks
- auth/password migration plan confirmed
- maintenance/read-only mode tested
- final migration command is scripted, not hand-clicked
- rollback path documented

Cutover:

1. Put old app in maintenance/read-only mode.
2. Verify no writes are accepted by the old app.
3. Final Supabase export.
4. Final R2 sync.
5. Final D1 import.
6. Run migration checks and save manifest.
7. Deploy Worker production.
8. Smoke test with admin, normal user, approver, auditor.
9. Open app to users.
10. Monitor errors, auth failures, D1 errors, WebSocket errors, and audit write failures.

Rollback:

- Point traffic back to old app.
- Keep Supabase unchanged until confidence window ends.
- If writes happened in new app, export delta audit/domain rows and decide manual reconciliation. Avoid automatic bidirectional sync unless absolutely required.
- Define rollback triggers before cutover: login failure spike, approval flow failure, audit write failure, attachment download failure, or data mismatch.
- Keep new app in maintenance mode after rollback until deltas are reconciled or discarded by decision.

## Testing Strategy

Keep tests small but focused.

Required checks:

- auth: login/logout/session/protected route
- authorization: user cannot cross org/BU boundaries
- workflow: create, submit, approve, reject, send back
- files: upload/download/delete with permission checks
- audit: each mutation appends event
- chat: WebSocket connect/send/reconnect/member denial
- migration: row counts and sample page parity

Do not create a huge test framework before migration. Add minimal runnable checks that catch permission and data-loss bugs.

## Adversarial Review

### Risk: D1 is SQLite, not Postgres

Current SQL uses Postgres enums, JSONB, functions, triggers, RLS, auth schema, and storage policies. D1 will not run that schema unchanged.

Mitigation:

- Convert schema intentionally through Drizzle.
- Move RPC logic into TypeScript services.
- Move RLS into explicit authorization functions.
- Test authorization before cutover.

### Risk: Replacing RLS can cause data leaks

Supabase RLS currently acts as a safety net. D1 has no equivalent row-level policy engine.

Mitigation:

- Centralize permission checks.
- Never query sensitive data directly from route/page code.
- Add negative authorization tests.
- Audit denied sensitive actions.

### Risk: Better Auth does not equal product permissions

Better Auth solves login/session. It does not know Agila's org, BU, role, workflow, auditor rules.

Mitigation:

- Use Better Auth only for identity.
- Keep Agila authorization in app services.
- Link Better Auth user id to Agila profile id.

### Risk: Real-time chat can lose messages if DO is treated as storage

Durable Objects are great for coordination, but chat history must remain queryable and auditable.

Mitigation:

- Write message to D1 before broadcast.
- D1 is source of truth.
- DO only broadcasts.
- Client fetches missed messages on reconnect.

### Risk: Audit trail can be incomplete if added late

If audit logging is bolted on at the end, important flows will be missed.

Mitigation:

- Add `recordAuditEvent()` before porting mutations.
- Make audit part of each service function contract.
- Review all Server Actions/API routes for audit coverage.
- Add hash chaining and R2 exports so audit rows are tamper-evident, not merely app-append-only.

### Risk: One-shot migration hides too many failures

Auth, DB, storage, realtime, and deployment changing together makes debugging ugly.

Mitigation:

- Runtime first.
- Storage second.
- Auth third.
- DB fourth.
- Chat fifth.
- Cutover last.

### Risk: Password migration may not be possible cleanly

Supabase password hashes may not be portable into Better Auth in a supported way.

Mitigation:

- Prefer forced password reset for migrated users unless a verified hash migration path exists.
- Communicate reset requirement before cutover.

### Risk: OpenNext binding access is misunderstood

Next.js code cannot assume bindings behave like Node environment variables in every context.

Mitigation:

- Prove D1/R2 access from Server Actions, API routes, middleware-equivalent code, and Durable Objects in Phase 1.
- Generate Cloudflare env types.
- Keep binding access behind tiny helpers.

### Risk: D1 scale limits are unknown for future usage

Expected data size is not huge, so D1 is reasonable now. If usage grows heavily, query design matters.

Mitigation:

- Add indexes deliberately.
- Keep attachments in R2, not D1.
- Monitor query latency.
- Use D1 read replication/session API later if reads become hot.

## Final Recommendation

Proceed with Cloudflare migration, but only as a staged migration.

Use Better Auth for basic username/password auth. Keep email for invites/recovery unless the client rejects it. Use Durable Objects WebSockets for real-time chat. Use D1 + Drizzle for product data. Use R2 for files. Use explicit TypeScript authorization and append-only, hash-linked audit events to replace Supabase RLS/RPC/security behavior.

The safest first implementation milestone is:

1. OpenNext Workers deploy while still using Supabase.
2. R2 storage migration.
3. Better Auth proof of concept with one migrated test user.
4. D1/Drizzle schema and one complete product slice: login -> dashboard -> request view.

## Open Decisions

1. Username login with email recovery, or username-only with admin reset?
2. Accept forced password reset for migrated users, or attempt password hash migration?
3. Are attachments always private except avatars?
4. Does audit log need a searchable UI in v1, or are D1/R2 exports plus admin export endpoint enough initially?
5. How long should Supabase remain read-only after cutover?

## Sources Checked

- Cloudflare Next.js on Workers/OpenNext: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare Workers bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Cloudflare D1 migrations and nested Drizzle layouts: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Drizzle ORM D1 setup: https://orm.drizzle.team/docs/get-started/d1-existing
- Better Auth D1 and username/password docs: https://www.better-auth.com/
