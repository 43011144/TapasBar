const test = require("node:test");
const assert = require("node:assert/strict");
const { getProviderConfigurationIssues } = require("./providerConfig");

test("requires valid Yoco settings before card checkout is enabled", () => {
  assert.equal(
    getProviderConfigurationIssues({
      YOCO_SECRET_KEY: "sk_test_1234567890",
      YOCO_WEBHOOK_SECRET: `whsec_${Buffer.from("secret").toString("base64")}`,
    }).length,
    0,
  );

  const issues = getProviderConfigurationIssues({
    YOCO_SECRET_KEY: "sk_test_replace-with-a-local-secret",
    YOCO_WEBHOOK_SECRET: "",
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "Tapas <orders@your-verified-domain.com>",
  });
  assert.equal(issues.length, 2);
  assert.equal(
    issues.some((issue) => issue.includes("YOCO_WEBHOOK_SECRET")),
    true,
  );
});

test("allows a PayShap simulation only in explicit development demo mode", () => {
  assert.deepEqual(
    getProviderConfigurationIssues(
      { NODE_ENV: "development", PAYMENT_DEMO_MODE: "true" },
      "payshap",
    ),
    [],
  );
  assert.equal(
    getProviderConfigurationIssues(
      { NODE_ENV: "production", PAYMENT_DEMO_MODE: "true" },
      "payshap",
    ).some((issue) => issue.includes("PEACH_API_KEY")),
    true,
  );
});

test("validates Peach sandbox credentials and a public return URL", () => {
  assert.deepEqual(
    getProviderConfigurationIssues(
      {
        PEACH_ENVIRONMENT: "sandbox",
        PEACH_API_KEY: "snd_sandboxkey123",
        PEACH_PROFILE_ID: "pro_tapasprofile123",
        PEACH_RETURN_URL: "https://tapasbar.testdomain.co.za/payment-return",
        PEACH_WEBHOOK_SECRET: "a-secure-test-secret-that-is-at-least-32-characters",
      },
      "payshap",
    ),
    [],
  );
});
