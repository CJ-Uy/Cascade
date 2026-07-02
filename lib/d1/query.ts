import { getCloudflareContext } from "@opennextjs/cloudflare";

type QueryRequest = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  select?: string;
  values?: any;
  filters: {
    column: string;
    op: "=" | "!=" | "in" | "is" | "not-in" | "ilike" | ">=" | "<=" | ">" | "<";
    value: unknown;
  }[];
  order?: { column: string; ascending: boolean };
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
};

export async function executeD1Query(request: QueryRequest) {
  if (request.table.startsWith("get_")) {
    return executeRpc(request.table, request.values);
  }

  const db = getCloudflareContext().env.AGILA_DB;
  const { sql, params } = buildSql(request);
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all();
  const rows = result.results ?? [];
  return { data: request.single ? (rows[0] ?? null) : rows, error: null };
}

function buildSql(request: QueryRequest) {
  const params: unknown[] = [];
  const where = buildWhere(request.filters, params);

  if (request.action === "insert") {
    const row = Array.isArray(request.values)
      ? request.values[0]
      : request.values;
    const columns = Object.keys(row);
    params.push(...columns.map((column) => row[column]));
    return {
      sql: `INSERT INTO ${ident(request.table)} (${columns.map(ident).join(", ")}) VALUES (${columns
        .map(() => "?")
        .join(", ")}) RETURNING *`,
      params,
    };
  }

  if (request.action === "update") {
    const columns = Object.keys(request.values);
    params.push(...columns.map((column) => request.values[column]));
    return {
      sql: `UPDATE ${ident(request.table)} SET ${columns
        .map((column) => `${ident(column)} = ?`)
        .join(", ")}${where.sql} RETURNING *`,
      params,
    };
  }

  if (request.action === "delete") {
    return {
      sql: `DELETE FROM ${ident(request.table)}${where.sql} RETURNING *`,
      params,
    };
  }

  const columns = selectColumns(request.select);
  const order = request.order
    ? ` ORDER BY ${ident(request.order.column)} ${request.order.ascending ? "ASC" : "DESC"}`
    : "";
  const limit =
    request.range || request.limit
      ? ` LIMIT ${request.range ? request.range.to - request.range.from + 1 : request.limit} OFFSET ${
          request.range?.from ?? 0
        }`
      : "";
  return {
    sql: `SELECT ${columns} FROM ${ident(request.table)}${where.sql}${order}${limit}`,
    params,
  };
}

function buildWhere(filters: QueryRequest["filters"], params: unknown[]) {
  if (!filters.length) return { sql: "" };

  const clauses = filters.map((filter) => {
    if (filter.column === "__or" && typeof filter.value === "string") {
      return parseOrFilter(filter.value, params);
    }

    if (filter.op === "in") {
      const values = coerceList(filter.value);
      params.push(...values);
      return `${ident(filter.column)} IN (${values.map(() => "?").join(", ") || "NULL"})`;
    }

    if (filter.op === "not-in") {
      const values = coerceList(filter.value);
      params.push(...values);
      return `${ident(filter.column)} NOT IN (${values.map(() => "?").join(", ") || "NULL"})`;
    }

    if (filter.op === "is") {
      if (filter.value === null) return `${ident(filter.column)} IS NULL`;
      params.push(filter.value);
      return `${ident(filter.column)} IS ?`;
    }

    if (filter.op === "ilike") {
      params.push(String(filter.value).replaceAll("%", "%").toLowerCase());
      return `LOWER(${ident(filter.column)}) LIKE LOWER(?)`;
    }

    params.push(filter.value);
    return `${ident(filter.column)} ${filter.op} ?`;
  });

  return { sql: ` WHERE ${clauses.join(" AND ")}` };
}

function coerceList(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOrFilter(value: string, params: unknown[]) {
  const clauses = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [column, op, ...rest] = part.split(".");
      const filterValue = rest.join(".");
      if (op === "eq") {
        params.push(filterValue);
        return `${ident(column)} = ?`;
      }
      if (op === "ilike") {
        params.push(filterValue);
        return `LOWER(${ident(column)}) LIKE LOWER(?)`;
      }
      params.push(filterValue);
      return `${ident(column)} = ?`;
    });

  return `(${clauses.join(" OR ") || "1 = 0"})`;
}

function selectColumns(select = "*") {
  if (select.includes("(") || select.includes("\n")) return "*";
  return select
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .map(ident)
    .join(", ");
}

function ident(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function executeRpc(name: string, _args?: Record<string, unknown>) {
  if (name === "get_user_auth_context") {
    const { getUserAuthContext } = await import("@/lib/auth/native");
    return { data: await getUserAuthContext(), error: null };
  }

  if (name === "admin_create_user_profile") {
    const args = _args ?? {};
    const db = getCloudflareContext().env.AGILA_DB;

    await db
      .prepare(
        `
        INSERT INTO profiles (
          id,
          username,
          first_name,
          last_name,
          email,
          organization_id,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          email = excluded.email,
          organization_id = excluded.organization_id,
          status = 'ACTIVE'
      `,
      )
      .bind(
        args.p_user_id,
        args.p_username,
        args.p_first_name,
        args.p_last_name,
        args.p_email,
        args.p_organization_id,
      )
      .run();

    await db
      .prepare(
        `
        INSERT OR IGNORE INTO user_business_units (
          user_id,
          business_unit_id,
          membership_type
        )
        VALUES (?, ?, 'MEMBER')
      `,
      )
      .bind(args.p_user_id, args.p_business_unit_id)
      .run();

    if (args.p_role_id) {
      await db
        .prepare(
          `
          INSERT OR IGNORE INTO user_role_assignments (user_id, role_id)
          VALUES (?, ?)
        `,
        )
        .bind(args.p_user_id, args.p_role_id)
        .run();
    }

    return { data: null, error: null };
  }

  return {
    data: null,
    error: { message: `RPC ${name} is not ported to D1 yet` },
  };
}
