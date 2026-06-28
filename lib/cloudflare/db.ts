import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export function createCloudflareDb(env: Pick<CloudflareEnv, "AGILA_DB">) {
  return drizzle(env.AGILA_DB, { schema });
}
