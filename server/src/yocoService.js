async function createYocoCheckout({ amountCents, orderId }) {
  const secretKey = process.env.YOCO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Yoco checkout is not configured.");
  }

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `tap-order-${orderId}`,
    },
    body: JSON.stringify({
      amount: amountCents,
      currency: "ZAR",
      clientReferenceId: String(orderId),
      metadata: { orderId: String(orderId) },
    }),
    signal: AbortSignal.timeout(15000),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Yoco returned an unreadable checkout response.");
  }
  if (!response.ok) {
    throw new Error(`Yoco could not create checkout (HTTP ${response.status}).`);
  }
  if (
    typeof body.id !== "string" ||
    typeof body.redirectUrl !== "string" ||
    !body.redirectUrl.startsWith("https://")
  ) {
    throw new Error("Yoco returned an invalid checkout response.");
  }
  return { id: body.id, redirectUrl: body.redirectUrl };
}

module.exports = { createYocoCheckout };
