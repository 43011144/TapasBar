function getProviderConfigurationIssues(env = process.env) {
  const issues = [];
  const yocoSecret = env.YOCO_SECRET_KEY?.trim() ?? "";
  const webhookSecret = env.YOCO_WEBHOOK_SECRET?.trim() ?? "";
  const resendKey = env.RESEND_API_KEY?.trim() ?? "";
  const fromEmail = env.RESEND_FROM_EMAIL?.trim() ?? "";
  const isPlaceholder = (value) => /replace-with|your-verified-domain|example/i.test(value);

  if (!/^sk_(test|live)_.+/.test(yocoSecret) || isPlaceholder(yocoSecret)) {
    issues.push("YOCO_SECRET_KEY must be a Yoco test or live secret key");
  }
  if (
    !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(webhookSecret) ||
    isPlaceholder(webhookSecret)
  ) {
    issues.push("YOCO_WEBHOOK_SECRET must be the signing secret for a Yoco webhook");
  }
  if (!/^re_.+/.test(resendKey) || isPlaceholder(resendKey)) {
    issues.push("RESEND_API_KEY must be a Resend API key");
  }
  const senderAddress = fromEmail.match(/<?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?$/)?.[1];
  if (!senderAddress || isPlaceholder(fromEmail)) {
    issues.push("RESEND_FROM_EMAIL must use an address on a verified Resend domain");
  }

  return issues;
}

module.exports = { getProviderConfigurationIssues };
