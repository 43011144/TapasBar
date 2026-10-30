const test = require("node:test");
const assert = require("node:assert/strict");
const { createPeachCheckout, PEACH_API_URLS } = require("./peachService");

const env = {
  PEACH_ENVIRONMENT: "sandbox",
  PEACH_API_KEY: "snd_test_key",
  PEACH_PROFILE_ID: "pro_test_profile",
  PEACH_RETURN_URL: "https://tapasbar.example.com/payment-return",
};

test("creates a Peach hosted checkout restricted to PayShap", async () => {
  let request;
  const checkout = await createPeachCheckout({
    amountCents: 12345,
    orderId: 73,
    customerEmail: "customer@example.com",
    env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          payment_id: "pay_demo_123",
          payment_link: { link: "https://app.sandbox-next.peachpayments.com/p/1" },
        }),
      };
    },
  });

  assert.equal(request.url, `${PEACH_API_URLS.sandbox}/payments`);
  assert.equal(request.options.headers["api-key"], env.PEACH_API_KEY);
  const body = JSON.parse(request.options.body);
  assert.equal(body.profile_id, env.PEACH_PROFILE_ID);
  assert.equal(body.amount, 12345);
  assert.equal(body.currency, "ZAR");
  assert.equal(body.confirm, false);
  assert.equal(body.payment_link, true);
  assert.deepEqual(body.allowed_payment_method_types, ["pay_shap"]);
  assert.deepEqual(body.metadata, { orderId: "73" });
  assert.deepEqual(checkout, {
    id: "pay_demo_123",
    redirectUrl: "https://app.sandbox-next.peachpayments.com/p/1",
  });
});

test("rejects a malformed or non-HTTPS Peach checkout link", async () => {
  await assert.rejects(
    createPeachCheckout({
      amountCents: 1000,
      orderId: 74,
      customerEmail: "customer@example.com",
      env,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          payment_id: "pay_demo_124",
          payment_link: { link: "http://insecure.example.com/checkout" },
        }),
      }),
    }),
    /invalid PayShap checkout response/,
  );
});
