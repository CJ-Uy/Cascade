# Cascade

Digital mass document approval and review system for multi-tenant workflows.

## Stack

- Next.js 16 / React 19
- Cloudflare Workers via OpenNext
- Cloudflare D1 with Drizzle migrations
- Cloudflare R2 for file storage
- Tailwind CSS 4 and shadcn/ui

## Local Development

```bash
npm install
npm run d1:migrate:local
npm run dev
```

## Cloudflare

```bash
npm run cf:typegen
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Set/reset migrated D1 passwords:

```bash
npm run d1:user:set-password -- --all --password password --remote
```

## Project Map

```text
app/                  Next.js routes and API handlers
components/           UI components
drizzle/              D1 migrations
lib/auth/             Native D1 auth
lib/cloudflare/       Drizzle/D1 schema and db helpers
lib/d1/               D1 query compatibility layer
lib/files/            R2 storage helpers
lib/supabase/         Compatibility shim name; backed by D1/R2, not Supabase
scripts/              D1/R2 verification and bootstrap scripts
wrangler.toml         Cloudflare bindings
```

## Notes

The old Docker/Supabase deployment has been removed. Remaining `supabase` names under `lib/supabase/` are compatibility imports only; they do not use the Supabase SDK or service.
