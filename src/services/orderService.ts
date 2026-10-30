import { apiRequest } from "./apiClient";

export type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type CheckoutPaymentMethod = "yoco" | "payshap";

export type StoredCheckout = {
  order: {
    id: number;
    total: string;
    currency: "ZAR";
    status: "pending";
  };
  payment: {
    status: "pending";
    method: "yoco" | "payshap" | "payshap_demo";
  };
  checkout:
    | { mode: "provider"; redirectUrl: string }
    | { mode: "demo"; redirectUrl: null };
  emailSent: boolean;
};

export type DemoPaymentOutcome = "approved" | "declined";

export type DemoPaymentResult = {
  demo: true;
  outcome: DemoPaymentOutcome;
  order: { id: number; status: "pending" };
  payment: { status: "cancelled" | "failed" };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function createCheckout(
  items: CheckoutItem[],
  customerEmail: string,
  paymentMethod: CheckoutPaymentMethod,
): Promise<StoredCheckout> {
  const result = await apiRequest<unknown>("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      customerEmail,
      paymentMethod,
      items: items.map(({ id, quantity }) => ({ id, quantity })),
    }),
  });

  const isDemoCheckout =
    isRecord(result) &&
    isRecord(result.payment) &&
    result.payment.method === "payshap_demo";
  const redirectUrl =
    isRecord(result) && isRecord(result.checkout)
      ? result.checkout.redirectUrl
      : undefined;
  const checkoutMode =
    isRecord(result) && isRecord(result.checkout)
      ? result.checkout.mode
      : undefined;

  if (
    !isRecord(result) ||
    !isRecord(result.order) ||
    !isRecord(result.payment) ||
    !isRecord(result.checkout) ||
    typeof result.order.id !== "number" ||
    typeof result.order.total !== "string" ||
    result.order.currency !== "ZAR" ||
    result.order.status !== "pending" ||
    result.payment.status !== "pending" ||
    (isDemoCheckout
      ? paymentMethod !== "payshap" ||
        checkoutMode !== "demo" ||
        redirectUrl !== null
      : result.payment.method !== paymentMethod ||
        checkoutMode !== "provider" ||
        typeof redirectUrl !== "string" ||
        !redirectUrl.startsWith("https://")) ||
    typeof result.emailSent !== "boolean"
  ) {
    throw new Error("The Tapas API returned an invalid checkout confirmation.");
  }

  const checkout = isDemoCheckout
    ? { mode: "demo" as const, redirectUrl: null }
    : { mode: "provider" as const, redirectUrl: redirectUrl as string };

  return {
    order: {
      id: result.order.id,
      total: result.order.total,
      currency: "ZAR",
      status: "pending",
    },
    payment: {
      status: "pending",
      method: isDemoCheckout ? "payshap_demo" : paymentMethod,
    },
    checkout,
    emailSent: result.emailSent,
  };
}

export async function completeDemoPayment(
  orderId: number,
  outcome: DemoPaymentOutcome,
): Promise<DemoPaymentResult> {
  const result = await apiRequest<unknown>(
    `/api/orders/${orderId}/demo-payment`,
    {
      method: "POST",
      body: JSON.stringify({ outcome }),
    },
  );

  if (
    !isRecord(result) ||
    result.demo !== true ||
    result.outcome !== outcome ||
    !isRecord(result.order) ||
    !isRecord(result.payment) ||
    result.order.id !== orderId ||
    result.order.status !== "pending" ||
    (result.payment.status !== "cancelled" && result.payment.status !== "failed") ||
    (outcome === "approved" && result.payment.status !== "cancelled") ||
    (outcome === "declined" && result.payment.status !== "failed")
  ) {
    throw new Error("The Tapas API returned an invalid demo payment result.");
  }

  return {
    demo: true,
    outcome,
    order: { id: orderId, status: "pending" },
    payment: { status: result.payment.status },
  };
}
