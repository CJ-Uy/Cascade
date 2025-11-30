#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the setup script
const setupSQL = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "seed", "setup.sql"),
  "utf8",
);

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Missing Supabase credentials");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSetup() {
  console.log("🚀 Running database setup...\n");

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_string: setupSQL,
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log("⚠️  exec_sql RPC not found, trying alternative method...\n");

      // Split by semicolons and execute each statement
      const statements = setupSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc("exec", {
          query: statement + ";",
        });
        if (stmtError && !stmtError.message.includes("does not exist")) {
          throw stmtError;
        }
      }
    }

    console.log("\n✅ Database setup completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Assign users to Super Admin role");
    console.log("  2. Create organizations");
    console.log("  3. Assign Organization Admins to organizations\n");
  } catch (error) {
    console.error("\n❌ Error running setup:", error.message);
    console.error(
      "\nPlease run the SQL manually via the Supabase dashboard or psql.\n",
    );
    process.exit(1);
  }
}

runSetup();
