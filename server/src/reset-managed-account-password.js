const { pool } = require("./database");
const { hashPassword } = require("./auth");
const { validateEmail } = require("./validation");
const { readHiddenInput } = require("./securePrompt");

async function main() {
  const role = process.argv[2];
  const email = validateEmail({ email: process.argv[3] });
  if (!["staff", "manager"].includes(role) || !email) {
    throw new Error(
      "Usage: node src/reset-managed-account-password.js <staff|manager> <email>",
    );
  }

  const password = await readHiddenInput(
    "New password (8-128 characters): ",
  );
  if (password.length < 8) {
    throw new Error("The password must be at least 8 characters.");
  }
  const confirmation = await readHiddenInput("Confirm new password: ");
  if (password !== confirmation) {
    throw new Error("The passwords do not match.");
  }

  const { salt, hash } = await hashPassword(password);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE email = ? AND role = ? FOR UPDATE",
      [email, role],
    );
    if (users.length !== 1) {
      throw new Error(`No ${role} account is registered with that email.`);
    }

    await connection.execute(
      `UPDATE users
       SET password_hash = ?, password_salt = ?
       WHERE id = ?`,
      [hash, salt, users[0].id],
    );
    await connection.execute(
      "DELETE FROM auth_sessions WHERE user_id = ?",
      [users[0].id],
    );
    await connection.execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ?",
      [users[0].id],
    );
    await connection.commit();
    transactionStarted = false;
    console.log(`Password reset for ${role} account ${email}; existing sessions revoked.`);
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
}

main().catch((error) => {
  console.error("Could not reset the managed account password:", error.message);
  process.exitCode = 1;
});
