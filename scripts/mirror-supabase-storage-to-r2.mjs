import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "agila-cf-beta-storage";
const DEFAULT_OUT_DIR = ".cf-data/r2";

const args = new Set(process.argv.slice(2));
const shouldUpload = !args.has("--no-upload");
const targetBucket = readFlag("--bucket") ?? DEFAULT_BUCKET;
const outDir = readFlag("--out-dir") ?? DEFAULT_OUT_DIR;

const env = loadEnv(".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
}

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false },
});

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) {
  throw new Error(`Failed to list Supabase buckets: ${bucketsError.message}`);
}

const manifest = {
  exported_at: new Date().toISOString(),
  target_bucket: targetBucket,
  buckets: {},
};

for (const bucket of buckets ?? []) {
  const objects = await listObjects(bucket.name);
  manifest.buckets[bucket.name] = objects.map(({ name, size }) => ({ name, size }));

  for (const object of objects) {
    const localPath = path.join(outDir, bucket.name, object.name);
    mkdirSync(path.dirname(localPath), { recursive: true });

    const { data, error } = await supabase.storage.from(bucket.name).download(object.name);
    if (error) {
      throw new Error(`Failed to download ${bucket.name}/${object.name}: ${error.message}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    writeFileSync(localPath, buffer);

    if (shouldUpload) {
      const args = [
        "wrangler",
        "r2",
        "object",
        "put",
        `${targetBucket}/${bucket.name}/${object.name}`,
        "--remote",
        "--file",
        localPath,
      ];
      if (data.type) {
        args.push("--content-type", data.type);
      }
      execSync(`npx ${args.map(cmdQuote).join(" ")}`, {
        stdio: "inherit",
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? "8527ec1369d46f55304a6f59ab5356e4",
        },
      });
    }
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

const totalObjects = Object.values(manifest.buckets).reduce((sum, objects) => sum + objects.length, 0);
console.log(`Mirrored ${totalObjects} storage object(s) from ${Object.keys(manifest.buckets).length} bucket(s)`);
console.log(`Manifest: ${path.join(outDir, "manifest.json")}`);

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

async function listObjects(bucket, prefix = "") {
  const objects = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`);
    }

    for (const item of data ?? []) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (isFolder(item)) {
        objects.push(...(await listObjects(bucket, itemPath)));
      } else {
        objects.push({
          name: itemPath,
          size: item.metadata?.size ?? item.metadata?.contentLength ?? null,
        });
      }
    }

    if (!data || data.length < pageSize) break;
  }

  return objects;
}

function isFolder(item) {
  return !item.id && !item.metadata?.size && !item.metadata?.contentLength;
}

function cmdQuote(value) {
  if (process.platform !== "win32") {
    return `'${String(value).replaceAll("'", "'\\''")}'`;
  }
  return `"${String(value).replaceAll('"', '\\"')}"`;
}
