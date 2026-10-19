const { createHmac, timingSafeEqual } = require("node:crypto");

function verifyYocoWebhook(rawBody, headers, secret, now = Date.now()) {
  const webhookId = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const signatureHeader = headers["webhook-signature"];
  if (
    typeof webhookId !== "string" ||
    typeof timestamp !== "string" ||
    typeof signatureHeader !== "string" ||
    typeof secret !== "string" ||
    !secret.startsWith("whsec_")
  ) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isInteger(timestampSeconds) ||
    Math.abs(now / 1000 - timestampSeconds) > 180
  ) {
    return false;
  }

  let secretBytes;
  try {
    secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  } catch {
    return false;
  }
  if (secretBytes.length === 0) {
    return false;
  }

  const signedContent = `${webhookId}.${timestamp}.${rawBody.toString("utf8")}`;
  const expectedSignature = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest();
  return signatureHeader.split(/\s+/).some((versionedSignature) => {
    const separator = versionedSignature.indexOf(",");
    if (separator < 0 || versionedSignature.slice(0, separator) !== "v1") {
      return false;
    }
    const suppliedSignature = Buffer.from(
      versionedSignature.slice(separator + 1),
      "base64",
    );
    return (
      suppliedSignature.length === expectedSignature.length &&
      timingSafeEqual(suppliedSignature, expectedSignature)
    );
  });
}

module.exports = { verifyYocoWebhook };
