function isPaymentDemoEnabled(env = process.env) {
  return env.NODE_ENV === "development" && env.PAYMENT_DEMO_MODE === "true";
}

function getProviderConfigurationIssues(env = process.env, paymentMethod = "yoco") {
  const issues = [];
  const isPlaceholder = (value) =>
    /replace-with|your-verified-domain|example/i.test(value);

  if (paymentMethod === "yoco") {
    const yocoSecret = env.YOCO_SECRET_KEY?.trim() ?? "";
    const webhookSecret = env.YOCO_WEBHOOK_SECRET?.trim() ?? "";
    if (!/^sk_(test|live)_.+/.test(yocoSecret) || isPlaceholder(yocoSecret)) {
      issues.push("YOCO_SECRET_KEY must be a Yoco test or live secret key");
    }
    if (
      !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(webhookSecret) ||
      isPlaceholder(webhookSecret)
    ) {
      issues.push(
        "YOCO_WEBHOOK_SECRET must be the signing secret for a Yoco webhook",
      );
    }
  } else if (paymentMethod === "payshap") {
    if (isPaymentDemoEnabled(env)) {
      return issues;
    }

    const apiKey = env.PEACH_API_KEY?.trim() ?? "";
    const profileId = env.PEACH_PROFILE_ID?.trim() ?? "";
    const returnUrl = env.PEACH_RETURN_URL?.trim() ?? "";
    const webhookSecret = env.PEACH_WEBHOOK_SECRET?.trim() ?? "";
    const environment = env.PEACH_ENVIRONMENT?.trim() || "sandbox";
    let parsedReturnUrl;

    if (!/^(snd|prd)_.+/.test(apiKey) || isPlaceholder(apiKey)) {
      issues.push("PEACH_API_KEY must be a Peach Orchestration API key");
    }
    if (!/^pro_.+/.test(profileId) || isPlaceholder(profileId)) {
      issues.push("PEACH_PROFILE_ID must be your Peach profile ID");
    }
    try {
      parsedReturnUrl = new URL(returnUrl);
    } catch {
      // The message below explains the required format.
    }
    if (
      !parsedReturnUrl ||
      parsedReturnUrl.protocol !== "https:" ||
      isPlaceholder(returnUrl)
    ) {
      issues.push("PEACH_RETURN_URL must be a public HTTPS return URL");
    }
    if (webhookSecret.length < 32 || isPlaceholder(webhookSecret)) {
      issues.push("PEACH_WEBHOOK_SECRET must be a random secret of at least 32 characters");
    }
    if (!["sandbox", "live"].includes(environment)) {
      issues.push("PEACH_ENVIRONMENT must be sandbox or live");
    }
    if (
      (environment === "sandbox" && apiKey.startsWith("prd_")) ||
      (environment === "live" && apiKey.startsWith("snd_"))
    ) {
      issues.push("PEACH_API_KEY must match PEACH_ENVIRONMENT");
    }
  } else {
    issues.push("Select a supported payment method");
  }

  return issues;
}

function isOrderEmailConfigured(env = process.env) {
  return Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim());
}

module.exports = {
  getProviderConfigurationIssues,
  isOrderEmailConfigured,
  isPaymentDemoEnabled,
};
