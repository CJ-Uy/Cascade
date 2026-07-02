# Cascade Agent Notes

Current platform: Cloudflare Workers via OpenNext, D1, R2, Drizzle, Next.js.

## Commands

```bash
pnpm run dev
pnpm run cf:typegen
pnpm run cf:build
pnpm run cf:preview
pnpm run cf:deploy
pnpm run d1:migrate:local
pnpm run d1:migrate:remote
```

## Data

- D1 binding: `AGILA_DB`
- R2 binding: `AGILA_BUCKET`
- Drizzle schema: `lib/cloudflare/schema.ts`
- D1 migrations: `drizzle/`
- Native auth: `lib/auth/native.ts`

## Compatibility Names

`lib/supabase/*` is a D1/R2 compatibility shim kept to avoid rewriting every caller at once. It does not import or call Supabase.

## Known Migration Work

Many historical `rpc(...)` call sites still need D1 implementations in `lib/d1/query.ts`. Until ported, they return `RPC <name> is not ported to D1 yet`.
