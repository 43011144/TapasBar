const {
  acquireManagerSetupLock,
  pool,
  releaseManagerSetupLock,
} = require("./database");
const { hashPassword } = require("./auth");
const { validateEmail } = require("./validation");

function readPassword() {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("Run this command in an interactive terminal."));
      return;
    }

    process.stdout.write("Manager password (8-128 characters): ");
    let password = "";
    const finish = (error) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(password);
      }
    };
    const onData = (data) => {
      for (const character of data.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Manager setup cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
          continue;
        }
        if (character >= " " && password.length < 128) {
          password += character;
        }
      }
    };
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function main() {
  const email = validateEmail({ email: process.argv[2] });
  if (!email) {
    throw new Error("Usage: npm run bootstrap-manager -- manager@example.com");
  }
  const password = await readPassword();
  if (password.length < 8) {
    throw new Error("The manager password must be at least 8 characters.");
  }

  const connection = await pool.getConnection();
  let lockAcquired = false;
  try {
    lockAcquired = await acquireManagerSetupLock(connection);
    if (!lockAcquired) {
      throw new Error("Could not acquire the manager setup lock. Try again.");
    }

    const [managers] = await connection.execute(
      "SELECT id FROM users WHERE role = 'manager' LIMIT 1",
    );
    if (managers.length > 0) {
      throw new Error(
        "A manager account already exists. Create additional accounts from the manager dashboard.",
      );
    }

    const { salt, hash } = await hashPassword(password);
    await connection.execute(
      `INSERT INTO users (email, password_hash, password_salt, role, staff_id)
       VALUES (?, ?, ?, 'manager', NULL)`,
      [email, hash, salt],
    );
    console.log(`Initial manager account created for ${email}.`);
  } finally {
    if (lockAcquired) {
      await releaseManagerSetupLock(connection);
    }
    connection.release();
  }
}

main().catch((error) => {
  console.error("Could not create the initial manager:", error.message);
  process.exitCode = 1;
});
