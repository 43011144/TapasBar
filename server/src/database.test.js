const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getConnectionConfig,
  getSslOptions,
  isUniqueConstraintViolation,
  prepareQuery,
  wrapClient,
} = require("./database");

test("converts API queries to PostgreSQL placeholders and preserves aliases", () => {
  assert.equal(
    prepareQuery(
      "SELECT id, staff_id AS staffId FROM users WHERE email = ? AND role = ? LIMIT 1",
    ),
    'SELECT id, staff_id AS "staffId" FROM users WHERE email = $1 AND role = $2 LIMIT 1',
  );
});

test("returns generated IDs for inserts and leaves menu upserts without an ID", () => {
  assert.equal(
    prepareQuery("INSERT INTO users (email) VALUES (?)"),
    "INSERT INTO users (email) VALUES ($1) RETURNING id",
  );
  assert.equal(
    prepareQuery("INSERT INTO menu_overrides (menu_item_id) VALUES (?)"),
    "INSERT INTO menu_overrides (menu_item_id) VALUES ($1)",
  );
});

test("identifies PostgreSQL unique constraint violations", () => {
  assert.equal(isUniqueConstraintViolation({ code: "23505" }), true);
  assert.equal(isUniqueConstraintViolation({ code: "42P01" }), false);
});

test("requires TLS verification for remote PostgreSQL connections", () => {
  assert.deepEqual(getSslOptions({}, "db.example.supabase.co", new Set()), {
    rejectUnauthorized: true,
  });
  assert.equal(
    getSslOptions({}, "127.0.0.1", new Set(["127.0.0.1"])),
    false,
  );
});

test("accepts raw PostgreSQL connection fields without URI password encoding", () => {
  assert.deepEqual(
    getConnectionConfig({
      PGHOST: "aws-0-eu-west-1.pooler.supabase.com",
      PGPORT: "5432",
      PGUSER: "postgres.xtadnjmaqjwzlolsjtzj",
      PGPASSWORD: "current-password",
      PGDATABASE: "postgres",
    }),
    {
      host: "aws-0-eu-west-1.pooler.supabase.com",
      port: 5432,
      user: "postgres.xtadnjmaqjwzlolsjtzj",
      password: "current-password",
      database: "postgres",
    },
  );
});

test("rejects incomplete direct PostgreSQL connection settings", () => {
  assert.throws(
    () => getConnectionConfig({ PGHOST: "db.example.supabase.co" }),
    /Incomplete PostgreSQL connection settings/,
  );
});

test("allows importing the database module without configured credentials", () => {
  assert.deepEqual(getConnectionConfig({}), {});
});

test("adapts PostgreSQL query results to the API's expected result shape", async () => {
  const calls = [];
  const connection = wrapClient({
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith("INSERT")) {
        return { rows: [{ id: 12 }], rowCount: 1, fields: [] };
      }
      if (sql.startsWith("SELECT")) {
        return { rows: [{ staffId: "STF-1" }], rowCount: 1, fields: [] };
      }
      return { rows: [], rowCount: 2, fields: [] };
    },
    release() {},
  });

  const [rows] = await connection.execute(
    "SELECT staff_id AS staffId FROM users WHERE id = ?",
    [12],
  );
  const [insertResult] = await connection.execute(
    "INSERT INTO users (email) VALUES (?)",
    ["guest@example.com"],
  );
  const [updateResult] = await connection.execute(
    "UPDATE users SET email = ? WHERE id = ?",
    ["new@example.com", 12],
  );

  assert.equal(rows[0].staffId, "STF-1");
  assert.deepEqual(insertResult, { insertId: 12, affectedRows: 1 });
  assert.deepEqual(updateResult, { insertId: null, affectedRows: 2 });
  assert.deepEqual(calls, [
    {
      sql: 'SELECT staff_id AS "staffId" FROM users WHERE id = $1',
      values: [12],
    },
    {
      sql: "INSERT INTO users (email) VALUES ($1) RETURNING id",
      values: ["guest@example.com"],
    },
    {
      sql: "UPDATE users SET email = $1 WHERE id = $2",
      values: ["new@example.com", 12],
    },
  ]);
});
