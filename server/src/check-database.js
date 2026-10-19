const { getConnectionConfig, pool } = require("./database");

async function main() {
  try {
    const databaseConfig = getConnectionConfig();
    if (!databaseConfig.connectionString && !databaseConfig.host) {
      throw new Error(
        "Set DATABASE_URL or all PGHOST, PGPORT, PGUSER, PGPASSWORD, and PGDATABASE variables in server/.env.",
      );
    }
    const [rows] = await pool.execute("SELECT 1 AS connected");
    if (rows[0]?.connected !== 1) {
      throw new Error("The database returned an unexpected health-check result.");
    }
    console.log("PostgreSQL database connection succeeded.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Could not connect to PostgreSQL:", error.message);
  process.exitCode = 1;
});
