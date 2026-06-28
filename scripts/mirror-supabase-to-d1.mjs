import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_DB = "agila-cf-beta-db";
const DEFAULT_OUT = ".cf-data/d1/agila-supabase-mirror.sql";
const MIGRATION_FILE = "supabase/migrations/20260307060013_remote_schema.sql";

const args = new Set(process.argv.slice(2));
const shouldImport = !args.has("--no-import");
const dbName = readFlag("--db") ?? DEFAULT_DB;
const outFile = readFlag("--out") ?? DEFAULT_OUT;

const env = loadEnv(".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
}

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false },
});

const schemaSql = readFileSync(MIGRATION_FILE, "utf8");
const tables = parsePublicTables(schemaSql);
const exportedAt = new Date();
const statements = [
  "PRAGMA foreign_keys = OFF;",
  'DROP TABLE IF EXISTS "__supabase_mirror_metadata";',
  'CREATE TABLE "__supabase_mirror_metadata" ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL, "updated_at" INTEGER NOT NULL);',
];
const counts = {};

for (const table of tables) {
  const rows = await fetchAllRows(table.name);
  counts[table.name] = rows.length;

  statements.push(`DROP TABLE IF EXISTS ${quoteIdent(table.name)};`);
  statements.push(createTableSql(table));

  for (const row of rows) {
    statements.push(insertRowSql(table, row));
  }
}

statements.push(
  insertMetadataSql("source_url_host", new URL(supabaseUrl).host, exportedAt),
  insertMetadataSql("exported_at", exportedAt.toISOString(), exportedAt),
  insertMetadataSql("table_counts", JSON.stringify(counts), exportedAt),
  "PRAGMA foreign_keys = ON;",
);

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${statements.join("\n")}\n`, "utf8");

console.log(`Wrote ${outFile}`);
console.log(`Tables: ${tables.length}`);
console.log(`Rows: ${Object.values(counts).reduce((sum, count) => sum + count, 0)}`);

if (shouldImport) {
  execSync(`npx wrangler d1 execute ${cmdQuote(dbName)} --remote --file ${cmdQuote(outFile)}`, {
    stdio: "inherit",
  });

  for (const [table, expected] of Object.entries(counts)) {
    const verifySql = `SELECT COUNT(*) AS count FROM ${quoteIdent(table)}`;
    const output = execSync(
      `npx wrangler d1 execute ${cmdQuote(dbName)} --remote --json --command ${cmdQuote(verifySql)}`,
      { encoding: "utf8" },
    );
    const actual = parseWranglerJson(output)[0]?.results?.[0]?.count;
    if (actual !== expected) {
      throw new Error(`D1 count mismatch for ${table}: expected ${expected}, got ${actual}`);
    }
  }

  console.log(`Imported and verified ${Object.keys(counts).length} tables in ${dbName}`);
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function loadEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
        .filter(Boolean)
        .map((match) => [
          match[1],
          match[2].trim().replace(/^['"]|['"]$/g, ""),
        ]),
    );
  } catch {
    return {};
  }
}

function parsePublicTables(sql) {
  const matches = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "public"\."([^"]+)" \(([\s\S]*?)\);/g)];
  return matches.map((match) => ({
    name: match[1],
    columns: parseColumns(match[2]),
  }));
}

function parseColumns(block) {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ""))
    .map((line) => {
      const match = line.match(/^"([^"]+)"\s+(.+)$/);
      if (!match) return null;
      return {
        name: match[1],
        type: mapSqliteType(match[2]),
      };
    })
    .filter(Boolean);
}

function mapSqliteType(postgresType) {
  const type = postgresType.toLowerCase();
  if (type.includes("boolean")) return "INTEGER";
  if (type.includes("bigint") || type.includes("integer") || type.includes("smallint")) return "INTEGER";
  if (type.includes("double") || type.includes("numeric") || type.includes("real")) return "REAL";
  return "TEXT";
}

async function fetchAllRows(table) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to read ${table}: ${error.message}`);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

function createTableSql(table) {
  const columns = table.columns.map((column) => `${quoteIdent(column.name)} ${column.type}`);
  return `CREATE TABLE ${quoteIdent(table.name)} (${columns.join(", ")});`;
}

function insertRowSql(table, row) {
  const columns = table.columns.map((column) => column.name);
  const values = columns.map((column) => sqlValue(row[column]));
  return `INSERT INTO ${quoteIdent(table.name)} (${columns.map(quoteIdent).join(", ")}) VALUES (${values.join(", ")});`;
}

function insertMetadataSql(key, value, date) {
  return `INSERT INTO "__supabase_mirror_metadata" ("key", "value", "updated_at") VALUES (${sqlValue(key)}, ${sqlValue(value)}, ${date.getTime()});`;
}

function quoteIdent(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date) return quoteString(value.toISOString());
  if (typeof value === "object") return quoteString(JSON.stringify(value));
  return quoteString(String(value));
}

function quoteString(value) {
  return `'${value.replaceAll("'", "''").replaceAll("\u0000", "")}'`;
}

function cmdQuote(value) {
  if (process.platform !== "win32") {
    return `'${String(value).replaceAll("'", "'\\''")}'`;
  }
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function parseWranglerJson(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  return JSON.parse(output.slice(start, end + 1));
}
