const { Resend } = require("resend");

async function sendOrderEmail({ to, orderId, total, paid }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Order email is not configured.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = paid
    ? `Payment confirmed for Tapas order #${orderId}`
    : `Tapas order #${orderId} received`;
  const statusMessage = paid
    ? "Your payment has been confirmed."
    : "We have received your order. Complete payment using the Yoco checkout page.";
  const text = [
    `Thank you for ordering from Tapas.`,
    ``,
    `Order number: #${orderId}`,
    `Total: R ${total}`,
    statusMessage,
  ].join("\n");
  const { error } = await resend.emails.send(
    {
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject,
      text,
      tags: [{ name: "order_id", value: String(orderId) }],
    },
    { idempotencyKey: `tap-${paid ? "paid" : "received"}-order-${orderId}` },
  );
  if (error) {
    throw new Error(`Resend could not send the order email: ${error.message}`);
  }
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Password-reset email is not configured.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send(
    {
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: "Reset your Tapas password",
      text: [
        "We received a request to reset your Tapas account password.",
        "",
        `Use this one-time link within 60 minutes: ${resetUrl}`,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      tags: [{ name: "email_type", value: "password_reset" }],
    },
    { idempotencyKey: `tap-password-reset-${to}-${Date.now()}` },
  );
  if (error) {
    throw new Error(`Resend could not send the password reset email: ${error.message}`);
  }
}

module.exports = { sendOrderEmail, sendPasswordResetEmail };
