import { apiRequest } from "./apiClient";

export type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type StoredCheckout = {
  order: {
    id: number;
    total: string;
    currency: "ZAR";
    status: "pending";
  };
  payment: {
    status: "pending";
    method: "yoco";
  };
  checkout: { redirectUrl: string };
  emailSent: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function createCheckout(
  items: CheckoutItem[],
  customerEmail: string,
): Promise<StoredCheckout> {
  const result = await apiRequest<unknown>("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      customerEmail,
      items: items.map(({ id, quantity }) => ({ id, quantity })),
    }),
  });

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
    result.payment.method !== "yoco" ||
    typeof result.checkout.redirectUrl !== "string" ||
    !result.checkout.redirectUrl.startsWith("https://") ||
    typeof result.emailSent !== "boolean"
  ) {
    throw new Error("The Tapas API returned an invalid checkout confirmation.");
  }

  return {
    order: {
      id: result.order.id,
      total: result.order.total,
      currency: "ZAR",
      status: "pending",
    },
    payment: {
      status: "pending",
      method: "yoco",
    },
    checkout: { redirectUrl: result.checkout.redirectUrl },
    emailSent: result.emailSent,
  };
}
