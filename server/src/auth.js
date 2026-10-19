const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 30;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return { salt, hash: hash.toString("hex") };
}

async function verifyPassword(password, salt, storedHash) {
  const actualHash = Buffer.from(storedHash, "hex");
  const suppliedHash = await scryptAsync(password, salt, actualHash.length);
  return (
    actualHash.length === suppliedHash.length &&
    timingSafeEqual(actualHash, suppliedHash)
  );
}

async function createSession(connection, userId) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await connection.execute(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
     VALUES (?, ?, CURRENT_TIMESTAMP + (? * INTERVAL '1 day'))`,
    [userId, tokenHash, SESSION_DAYS],
  );
  return token;
}

module.exports = {
  createSession,
  hashPassword,
  hashToken,
  verifyPassword,
};
