import { mockDb, mockUser } from './mockDb';

const generateId = () => `mock-${Math.random().toString(36).slice(2, 10)}`;

type Filter = { column: string; value: string | number | null };

type Order = { column: string; ascending: boolean };

class MockQuery {
  private table: keyof typeof mockDb;
  private filters: Filter[] = [];
  private orderBy: Order | null = null;
  private orExpr: string | null = null;
  private insertedRows: any[] | null = null;
  private selectArg: string | null = null;
  private updatePayload: any | null = null;

  constructor(table: keyof typeof mockDb) {
    this.table = table;
  }

  select(arg?: string) {
    this.selectArg = arg ?? null;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  or(expr: string) {
    this.orExpr = expr;
    return this;
  }

  order(column: string, { ascending }: { ascending: boolean }) {
    this.orderBy = { column, ascending };
    return this.execute();
  }

  insert(payload: any) {
    const rows = Array.isArray(payload) ? payload : [payload];
    const nextRows = rows.map((row) => ({
      ...row,
      id: row.id ?? generateId(),
      created_at: row.created_at ?? new Date().toISOString(),
    }));
    mockDb[this.table].unshift(...nextRows);
    this.insertedRows = nextRows;
    return this;
  }

  update(payload: any) {
    this.updatePayload = payload;
    return this;
  }

  upsert(payload: any) {
    const rows = Array.isArray(payload) ? payload : [payload];
    rows.forEach((row) => {
      const matchByRole =
        this.table === 'project_role_permissions' && row.project_id && row.role
          ? (mockDb[this.table] as any[]).findIndex(
              (item) => item.project_id === row.project_id && item.role === row.role
            )
          : -1;
      const index =
        matchByRole >= 0
          ? matchByRole
          : (mockDb[this.table] as any[]).findIndex((item) => item.id === row.id);
      if (index >= 0) {
        (mockDb[this.table] as any[])[index] = { ...mockDb[this.table][index], ...row };
      } else {
        (mockDb[this.table] as any[]).push({
          ...row,
          id: row.id ?? generateId(),
          created_at: row.created_at ?? new Date().toISOString(),
        });
      }
    });
    return this;
  }

  delete() {
    const rows = this.filterRows();
    mockDb[this.table] = (mockDb[this.table] as any[]).filter((row) => !rows.includes(row)) as any;
    return Promise.resolve({ data: rows, error: null });
  }

  single() {
    if (this.insertedRows && this.insertedRows.length > 0) {
      return Promise.resolve({ data: this.insertedRows[0], error: null });
    }
    const rows = this.filterRows();
    if (this.updatePayload) {
      const updatedRows = rows.map((row) => ({ ...row, ...this.updatePayload }));
      mockDb[this.table] = (mockDb[this.table] as any[]).map((row) =>
        rows.includes(row) ? { ...row, ...this.updatePayload } : row
      ) as any;
      return Promise.resolve({ data: updatedRows[0] ?? null, error: null });
    }
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  async execute() {
    if (this.insertedRows) {
      return { data: this.insertedRows, error: null };
    }
    let rows = this.filterRows();

    if (this.updatePayload) {
      const updatedRows = rows.map((row) => ({ ...row, ...this.updatePayload }));
      mockDb[this.table] = (mockDb[this.table] as any[]).map((row) =>
        rows.includes(row) ? { ...row, ...this.updatePayload } : row
      ) as any;
      rows = updatedRows;
    }

    if (this.selectArg?.includes('project:projects')) {
      rows = rows.map((row: any) => ({
        ...row,
        project: mockDb.projects.find((project) => project.id === row.project_id) ?? null,
      }));
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = rows.sort((a: any, b: any) => {
        if (a[column] === b[column]) return 0;
        return ascending ? (a[column] > b[column] ? 1 : -1) : (a[column] < b[column] ? 1 : -1);
      });
    }

    return { data: rows, error: null };
  }

  private filterRows() {
    let rows = [...(mockDb[this.table] as any[])];

    if (this.filters.length > 0) {
      rows = rows.filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
    }

    if (this.orExpr) {
      const parts = this.orExpr.split(',');
      const orFilters = parts.map((part) => {
        const [column, op, value] = part.split('.');
        if (op === 'eq') return { column, value };
        return null;
      }).filter(Boolean) as { column: string; value: string }[];

      rows = rows.filter((row) => orFilters.some((filter) => String(row[filter.column]) === filter.value));
    }

    return rows;
  }
}

export const createMockSupabase = (options?: { user?: typeof mockUser }) => {
  const activeUser = options?.user ?? mockUser;
  const auth = {
    getSession: async () => ({ data: { session: { user: activeUser } }, error: null }),
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      callback('SIGNED_IN', { user: activeUser });
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getUser: async () => ({ data: { user: activeUser }, error: null }),
    signInWithPassword: async () => ({ data: { session: { user: activeUser } }, error: null }),
    signUp: async () => ({ data: { session: { user: activeUser } }, error: null }),
    signInWithOtp: async () => ({ data: { session: { user: activeUser } }, error: null }),
    signOut: async () => ({ error: null }),
  };

  return {
    auth,
    from: (table: keyof typeof mockDb) => new MockQuery(table),
  };
};
