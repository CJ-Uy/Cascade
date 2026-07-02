type Filter = {
  column: string;
  op: "=" | "!=" | "in" | "is" | "not-in" | "ilike" | ">=" | "<=" | ">" | "<";
  value: unknown;
};
type Order = { column: string; ascending: boolean };

type Executor = (request: QueryRequest) => Promise<any>;
type AuthCompat = {
  getUser(): Promise<any>;
  getSession(): Promise<any>;
  signInWithPassword(input: { email: string; password: string }): Promise<any>;
  signOut(): Promise<any>;
  signUp(input?: any): Promise<any>;
  updateUser(input: { password?: string }): Promise<any>;
};

type QueryRequest = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  select?: string;
  values?: any;
  filters: Filter[];
  order?: Order;
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
};

export function createCompatClient(executor: Executor, auth: AuthCompat) {
  return {
    auth,
    from(table: string) {
      return new QueryBuilder(executor, table);
    },
    async rpc(name: string, args?: Record<string, unknown>) {
      return executor({
        table: name,
        action: "select",
        values: args,
        filters: [],
      });
    },
    channel(_name?: string) {
      return {
        on(_event?: string, _filter?: unknown, _callback?: unknown) {
          return this;
        },
        subscribe(_callback?: unknown) {
          return this;
        },
      };
    },
    removeChannel() {},
    storage: {
      from(bucket: string) {
        return {
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `/api/files/${encodeURIComponent(bucket)}/${path
                  .split("/")
                  .map(encodeURIComponent)
                  .join("/")}`,
              },
            };
          },
          async upload(path: string, file: File) {
            const body = new FormData();
            body.set("file", file);
            const response = await fetch(
              `/api/files/${encodeURIComponent(bucket)}/${path
                .split("/")
                .map(encodeURIComponent)
                .join("/")}`,
              {
                method: "PUT",
                body,
              },
            );
            return response.ok
              ? { data: { path }, error: null }
              : { data: null, error: { message: await response.text() } };
          },
          async remove(paths: string[]) {
            const errors = [];
            for (const path of paths) {
              const response = await fetch(
                `/api/files/${encodeURIComponent(bucket)}/${path
                  .split("/")
                  .map(encodeURIComponent)
                  .join("/")}`,
                { method: "DELETE" },
              );
              if (!response.ok) errors.push(await response.text());
            }
            return errors.length
              ? { data: null, error: { message: errors.join("; ") } }
              : { data: paths, error: null };
          },
        };
      },
    },
  };
}

class QueryBuilder {
  private request: QueryRequest;

  constructor(
    private executor: Executor,
    table: string,
  ) {
    this.request = { table, action: "select", filters: [] };
  }

  select(columns = "*", _options?: unknown) {
    this.request.action =
      this.request.action === "select" ? "select" : this.request.action;
    this.request.select = columns;
    return this;
  }

  insert(values: any) {
    this.request.action = "insert";
    this.request.values = values;
    return this;
  }

  update(values: any) {
    this.request.action = "update";
    this.request.values = values;
    return this;
  }

  delete() {
    this.request.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.request.filters.push({ column, op: "=", value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.request.filters.push({ column, op: "!=", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.request.filters.push({ column, op: "in", value });
    return this;
  }

  is(column: string, value: unknown) {
    this.request.filters.push({ column, op: "is", value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "in") {
      this.request.filters.push({ column, op: "not-in", value });
    } else {
      this.request.filters.push({ column, op: "!=", value });
    }
    return this;
  }

  ilike(column: string, value: string) {
    this.request.filters.push({ column, op: "ilike", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.request.filters.push({ column, op: ">=", value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.request.filters.push({ column, op: "<=", value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.request.filters.push({ column, op: ">", value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.request.filters.push({ column, op: "<", value });
    return this;
  }

  or(value: string) {
    this.request.filters.push({ column: "__or", op: "=", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.request.order = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.request.limit = value;
    return this;
  }

  range(from: number, to: number) {
    this.request.range = { from, to };
    return this;
  }

  single() {
    this.request.single = true;
    return this;
  }

  maybeSingle() {
    this.request.single = true;
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.executor(this.request).then(onfulfilled, onrejected);
  }
}
