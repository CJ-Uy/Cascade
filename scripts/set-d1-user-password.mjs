import { execFileSync } from "node:child_process";
import { randomBytes, pbkdf2Sync } from "node:crypto";
import { join } from "node:path";

const email = readFlag("--email")?.toLowerCase();
const password = readFlag("--password");
const dbName = readFlag("--db") ?? "agila-cf-beta-db";
const targetFlag = process.argv.includes("--remote") ? "--remote" : "--local";
const all = process.argv.includes("--all");

if ((!email && !all) || !password) {
  throw new Error(
    "Usage: node scripts/set-d1-user-password.mjs (--email user@email.com | --all) --password value [--remote]",
  );
}

const salt = randomBytes(16).toString("base64");
const hash = pbkdf2Sync(
  password,
  Buffer.from(salt, "base64"),
  210000,
  32,
  "sha256",
).toString("base64");
const now = Date.now();

if (all) {
  execute(`
    INSERT INTO auth_users (id, email, password_hash, password_salt, reset_required, created_at, updated_at)
    SELECT id, lower(email), ${sqlValue(hash)}, ${sqlValue(salt)}, 0, ${now}, ${now}
    FROM profiles
    WHERE email IS NOT NULL AND trim(email) != ''
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      reset_required = 0,
      updated_at = excluded.updated_at
  `);

  const counts = parseWranglerJson(
    execute(`
      SELECT
        (SELECT COUNT(*) FROM profiles WHERE email IS NOT NULL AND trim(email) != '') AS profiles,
        (SELECT COUNT(*) FROM auth_users) AS auth_users
    `),
  )[0]?.results?.[0];
  console.log(
    `Set D1 password for ${counts?.profiles ?? "all"} migrated users ${targetFlag}`,
  );
  process.exit(0);
}

const profile = queryOne(
  `SELECT id, email FROM profiles WHERE lower(email) = ${sqlValue(email)} LIMIT 1`,
);
if (!profile) {
  throw new Error(`No migrated profile found for ${email}`);
}

execute(`
  INSERT INTO auth_users (id, email, password_hash, password_salt, reset_required, created_at, updated_at)
  VALUES (${sqlValue(profile.id)}, ${sqlValue(profile.email)}, ${sqlValue(hash)}, ${sqlValue(salt)}, 0, ${now}, ${now})
  ON CONFLICT(id) DO UPDATE SET
    email = excluded.email,
    password_hash = excluded.password_hash,
    password_salt = excluded.password_salt,
    reset_required = 0,
    updated_at = excluded.updated_at
`);

console.log(`Set D1 password for ${profile.email} ${targetFlag}`);

function queryOne(sql) {
  return parseWranglerJson(execute(sql))[0]?.results?.[0];
}

function execute(sql) {
  return execFileSync(
    process.execPath,
    [
      join("node_modules", "wrangler", "bin", "wrangler.js"),
      "d1",
      "execute",
      dbName,
      targetFlag,
      "--json",
      "--command",
      sql,
    ],
    { encoding: "utf8" },
  );
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sqlValue(value) {
  return `'${String(value).replaceAll("'", "''").replaceAll("\u0000", "")}'`;
}

function parseWranglerJson(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  return JSON.parse(output.slice(start, end + 1));
}
