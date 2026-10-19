import { ApiError, apiRequest } from "./apiClient";

export type RestaurantTable = {
  id: number;
  floorNumber: number;
  minCapacity: number;
  maxCapacity: number;
};

export type NewReservation = {
  tableId: number;
  date: string;
  time: string;
  partySize: number;
  customerName: string;
  customerEmail: string;
};

export type ReservationCancellation = {
  reservationId: number;
  customerEmail: string;
};

export class BookingServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BookingServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTables(value: unknown): RestaurantTable[] {
  if (!Array.isArray(value)) {
    throw new Error("Booking service returned invalid table data.");
  }

  return value.map((row: unknown) => {
    if (!isRecord(row)) {
      throw new Error("Booking service returned invalid table data.");
    }

    if (
      typeof row.id !== "number" ||
      !Number.isInteger(row.id) ||
      typeof row.floorNumber !== "number" ||
      !Number.isInteger(row.floorNumber) ||
      typeof row.minCapacity !== "number" ||
      !Number.isInteger(row.minCapacity) ||
      typeof row.maxCapacity !== "number" ||
      !Number.isInteger(row.maxCapacity)
    ) {
      throw new Error("Booking service returned invalid table data.");
    }

    return {
      id: row.id,
      floorNumber: row.floorNumber,
      minCapacity: row.minCapacity,
      maxCapacity: row.maxCapacity,
    };
  });
}

function throwIfApiFailed(error: unknown): never {
  if (error instanceof ApiError) {
    throw new BookingServiceError(error.message, error.status);
  }
  throw error;
}

export async function getTables() {
  try {
    const result = await apiRequest<{ tables: unknown }>("/api/tables");
    return parseTables(result.tables);
  } catch (error) {
    throwIfApiFailed(error);
  }
}

export async function getAvailableTables(
  date: string,
  time: string,
  partySize: number,
) {
  const query = new URLSearchParams({
    date,
    time,
    partySize: String(partySize),
  });
  try {
    const result = await apiRequest<{ tables: unknown }>(
      `/api/availability?${query.toString()}`,
    );
    return parseTables(result.tables);
  } catch (error) {
    throwIfApiFailed(error);
  }
}

export async function createReservation(reservation: NewReservation) {
  try {
    const result = await apiRequest<{
      reservation?: { id?: number };
    }>("/api/reservations", {
      method: "POST",
      body: JSON.stringify(reservation),
    });

    if (
      !isRecord(result.reservation) ||
      typeof result.reservation.id !== "number"
    ) {
      throw new Error("Booking service did not confirm the reservation.");
    }

    return { id: result.reservation.id };
  } catch (error) {
    throwIfApiFailed(error);
  }
}

export async function cancelReservation({
  reservationId,
  customerEmail,
}: ReservationCancellation) {
  try {
    const result = await apiRequest<{ cancelled?: boolean; reservationId?: number }>(
      "/api/reservations/cancel",
      {
        method: "POST",
        body: JSON.stringify({ reservationId, customerEmail }),
      },
    );

    if (result.cancelled !== true || typeof result.reservationId !== "number") {
      throw new Error("Booking service did not confirm the cancellation.");
    }

    return { id: result.reservationId };
  } catch (error) {
    throwIfApiFailed(error);
  }
}
