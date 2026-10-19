const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { verifyYocoWebhook } = require("./yocoWebhook");

test("verifies signed Yoco webhooks and rejects stale or changed requests", () => {
  const now = Date.now();
  const rawBody = Buffer.from('{"type":"payment.succeeded"}');
  const secretBytes = Buffer.from("test-webhook-secret");
  const secret = `whsec_${secretBytes.toString("base64")}`;
  const webhookId = "event-123";
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", secretBytes)
    .update(`${webhookId}.${timestamp}.${rawBody.toString("utf8")}`)
    .digest("base64");
  const headers = {
    "webhook-id": webhookId,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}`,
  };

  assert.equal(verifyYocoWebhook(rawBody, headers, secret, now), true);
  assert.equal(
    verifyYocoWebhook(Buffer.from('{"type":"payment.failed"}'), headers, secret, now),
    false,
  );
  assert.equal(
    verifyYocoWebhook(
      rawBody,
      { ...headers, "webhook-timestamp": String(Number(timestamp) - 181) },
      secret,
      now,
    ),
    false,
  );
});
