const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyPeachWebhook } = require("./peachWebhook");

const secret = "a-secure-test-secret-that-is-at-least-32-characters";

test("accepts only the configured Peach webhook secret header", () => {
  assert.equal(
    verifyPeachWebhook({ "x-peach-webhook-secret": secret }, secret),
    true,
  );
  assert.equal(
    verifyPeachWebhook({ "x-peach-webhook-secret": "wrong-secret" }, secret),
    false,
  );
  assert.equal(verifyPeachWebhook({}, secret), false);
  assert.equal(
    verifyPeachWebhook({ "x-peach-webhook-secret": secret }, "short"),
    false,
  );
});
