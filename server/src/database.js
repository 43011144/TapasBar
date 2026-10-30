const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Pool, types } = require("pg");

const MANAGER_SETUP_LOCK_ID = 72193541;

types.setTypeParser(20, (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
});
types.setTypeParser(1700, (value) => Number(value));

function createPool(env = process.env) {
  const connectionConfig = getConnectionConfig(env);
  const connectionHost = connectionConfig.host;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "db"]);
  const ssl = getSslOptions(env, connectionHost, localHosts);

  return new Pool({
    ...connectionConfig,
    ssl,
    max: Number(env.PGPOOL_MAX || 10),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

function getConnectionConfig(env = process.env) {
  // Render and other hosts usually expose one connection URL. Prefer it over
  // partial PG* variables left in the service environment, which otherwise
  // make pg fail during module import before the API can start.
  const connectionString = env.SUPABASE_DB_URL || env.DATABASE_URL;
  if (connectionString) {
    const url = new URL(connectionString);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
    }
    return { connectionString, host: url.hostname };
  }

  const directConnectionVariables = [
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
  ];
  const hasDirectConnectionVariables = directConnectionVariables.some(
    (name) => env[name],
  );

  if (hasDirectConnectionVariables) {
    const missing = directConnectionVariables.filter((name) => !env[name]);
    if (missing.length > 0) {
      throw new Error(
        `Incomplete PostgreSQL connection settings; set ${missing.join(", ")} or provide SUPABASE_DB_URL/DATABASE_URL.`,
      );
    }
    return {
      host: env.PGHOST,
      port: Number(env.PGPORT),
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
    };
  }

  if (!hasDirectConnectionVariables) {
    return {};
  }
}

function getSslOptions(env, connectionHost, localHosts) {
  if (localHosts.has(connectionHost)) {
    return false;
  }
  if (env.PGSSLROOTCERT) {
    return {
      ca: readFileSync(path.resolve(env.PGSSLROOTCERT), "utf8"),
      rejectUnauthorized: true,
    };
  }
  return { rejectUnauthorized: true };
}

function prepareQuery(sql) {
  const quotedAliases = sql.replace(
    /\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    (_match, alias) => `AS "${alias}"`,
  );
  let parameterIndex = 0;
  let query = quotedAliases.replace(/\?/g, () => `$${++parameterIndex}`);
  const insert = query.match(/^\s*INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/i);
  if (insert && insert[1].toLowerCase() !== "menu_overrides") {
    query += " RETURNING id";
  }
  return query;
}

function wrapClient(client) {
  return {
    async execute(sql, values = []) {
      const result = await client.query(prepareQuery(sql), values);
      if (/^\s*(SELECT|WITH)\b/i.test(sql)) {
        return [result.rows, result.fields];
      }
      return [
        {
          insertId: result.rows[0]?.id ?? null,
          affectedRows: result.rowCount ?? 0,
        },
        result.fields,
      ];
    },
    async beginTransaction() {
      await client.query("BEGIN");
    },
    async commit() {
      await client.query("COMMIT");
    },
    async rollback() {
      await client.query("ROLLBACK");
    },
    release() {
      client.release();
    },
  };
}

const pool = createPool();

pool.getConnection = async () => wrapClient(await pool.connect());
pool.execute = async (sql, values = []) => {
  const connection = await pool.getConnection();
  try {
    return await connection.execute(sql, values);
  } finally {
    connection.release();
  }
};

async function acquireManagerSetupLock(connection) {
  const deadline = Date.now() + 10_000;
  do {
    const [rows] = await connection.execute(
      "SELECT pg_try_advisory_lock(?) AS acquired",
      [MANAGER_SETUP_LOCK_ID],
    );
    if (rows[0]?.acquired === true) {
      return true;
    }
    if (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (Date.now() < deadline);
  return false;
}

async function releaseManagerSetupLock(connection) {
  await connection.execute("SELECT pg_advisory_unlock(?)", [
    MANAGER_SETUP_LOCK_ID,
  ]);
}

function isUniqueConstraintViolation(error) {
  return error?.code === "23505";
}

module.exports = {
  acquireManagerSetupLock,
  getConnectionConfig,
  getSslOptions,
  isUniqueConstraintViolation,
  prepareQuery,
  pool,
  releaseManagerSetupLock,
  wrapClient,
};
