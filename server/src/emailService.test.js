const test = require("node:test");
const assert = require("node:assert/strict");
const { getOrderNotificationEmail } = require("./emailService");

test("uses the requested Gmail account for owner order notifications by default", () => {
  assert.equal(getOrderNotificationEmail({}), "kgift6995@gmail.com");
});

test("allows the owner notification recipient to be configured", () => {
  assert.equal(
    getOrderNotificationEmail({ ORDER_NOTIFICATION_EMAIL: "owner@example.com" }),
    "owner@example.com",
  );
});

test("falls back to the requested Gmail account when the override is blank", () => {
  assert.equal(
    getOrderNotificationEmail({ ORDER_NOTIFICATION_EMAIL: "  " }),
    "kgift6995@gmail.com",
  );
});
