const { timingSafeEqual } = require("node:crypto");

function verifyPeachWebhook(headers, secret) {
  const supplied = headers["x-peach-webhook-secret"];
  if (
    typeof supplied !== "string" ||
    typeof secret !== "string" ||
    secret.length < 32
  ) {
    return false;
  }

  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(secret);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

module.exports = { verifyPeachWebhook };
