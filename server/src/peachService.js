const PEACH_API_URLS = {
  sandbox: "https://app.sandbox-next.peachpayments.com/api",
  live: "https://app.next.peachpayments.com/api",
};

async function createPeachCheckout({
  amountCents,
  orderId,
  customerEmail,
  env = process.env,
  fetchImpl = fetch,
}) {
  const apiKey = env.PEACH_API_KEY?.trim();
  const profileId = env.PEACH_PROFILE_ID?.trim();
  const returnUrl = env.PEACH_RETURN_URL?.trim();
  const environment = env.PEACH_ENVIRONMENT?.trim() || "sandbox";
  const apiUrl = PEACH_API_URLS[environment];
  if (!apiKey || !profileId || !returnUrl || !apiUrl) {
    throw new Error("Peach PayShap checkout is not configured.");
  }

  const response = await fetchImpl(`${apiUrl}/payments`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile_id: profileId,
      amount: amountCents,
      currency: "ZAR",
      confirm: false,
      payment_link: true,
      session_expiry: 3600,
      description: `Tapas order #${orderId}`,
      return_url: returnUrl,
      allowed_payment_method_types: ["pay_shap"],
      customer: { email: customerEmail },
      metadata: { orderId: String(orderId) },
      payment_link_config: {
        seller_name: "Tapas Pub & Grill",
        payment_button_text: "Pay with PayShap",
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Peach returned an unreadable checkout response.");
  }
  if (!response.ok) {
    throw new Error(`Peach could not create PayShap checkout (HTTP ${response.status}).`);
  }

  const paymentLink = body?.payment_link;
  if (
    typeof body?.payment_id !== "string" ||
    typeof paymentLink?.link !== "string" ||
    !paymentLink.link.startsWith("https://")
  ) {
    throw new Error("Peach returned an invalid PayShap checkout response.");
  }

  return { id: body.payment_id, redirectUrl: paymentLink.link };
}

module.exports = { createPeachCheckout, PEACH_API_URLS };
