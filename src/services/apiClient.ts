export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const apiUrl = process.env.EXPO_PUBLIC_BOOKING_API_URL?.replace(/\/+$/, "");

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  if (!apiUrl) {
    throw new Error(
      "The Tapas API is not configured. Set EXPO_PUBLIC_BOOKING_API_URL in .env and restart the app.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? ` (${error.message})` : "";
    throw new Error(
      `Could not reach the booking API at ${apiUrl}. Start the MySQL API and check that this address is reachable from the device.${detail}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      "The booking API returned an unreadable response. Check that EXPO_PUBLIC_BOOKING_API_URL points to the API server.",
    );
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The Tapas API request failed.";
    throw new ApiError(message, response.status);
  }

  return body as T;
}
