const test = require("node:test");
const assert = require("node:assert/strict");
const { getProviderConfigurationIssues } = require("./providerConfig");

test("requires valid Yoco and Resend settings before checkout is enabled", () => {
  assert.equal(
    getProviderConfigurationIssues({
      YOCO_SECRET_KEY: "sk_test_1234567890",
      YOCO_WEBHOOK_SECRET: `whsec_${Buffer.from("secret").toString("base64")}`,
      RESEND_API_KEY: "re_1234567890",
      RESEND_FROM_EMAIL: "Tapas <orders@tapas.co.za>",
    }).length,
    0,
  );

  const issues = getProviderConfigurationIssues({
    YOCO_SECRET_KEY: "sk_test_replace-with-a-local-secret",
    YOCO_WEBHOOK_SECRET: "",
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "Tapas <orders@your-verified-domain.com>",
  });
  assert.equal(issues.length, 4);
  assert.equal(
    issues.some((issue) => issue.includes("YOCO_WEBHOOK_SECRET")),
    true,
  );
});
