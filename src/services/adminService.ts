import { apiRequest } from "./apiClient";

export type AdminBooking = {
  id: number;
  date: string;
  time: string;
  tableId: number;
  floorNumber: number;
  partySize: number;
  customerName: string;
  customerEmail: string;
  createdAt: string;
};

export type AdminOrderItem = {
  itemName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type AdminOrder = {
  id: number;
  customerEmail: string;
  totalAmount: string;
  currency: string;
  status: string;
  createdAt: string;
  paymentStatus: string | null;
  items: AdminOrderItem[];
};

export type AdminMenuItem = {
  id: string;
  name: string;
  priceCents: number;
  isActive: boolean;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getAdminBookings(token: string) {
  return apiRequest<{ bookings: AdminBooking[] }>("/api/admin/bookings", {
    headers: authHeaders(token),
  });
}

export async function getAdminOrders(token: string) {
  return apiRequest<{ orders: AdminOrder[] }>("/api/admin/orders", {
    headers: authHeaders(token),
  });
}

export async function getAdminMenu(token: string) {
  return apiRequest<{ items: AdminMenuItem[] }>("/api/admin/menu", {
    headers: authHeaders(token),
  });
}

export async function createManagedAccount(
  token: string,
  email: string,
  password: string,
  role: "staff" | "manager",
) {
  return apiRequest<{
    user: {
      id: number;
      email: string;
      role: "staff" | "manager";
      staffId?: string;
    };
  }>("/api/admin/accounts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ email, password, role }),
  });
}

export async function updateAdminMenuItem(
  token: string,
  item: AdminMenuItem,
) {
  return apiRequest<{ item: AdminMenuItem }>(`/api/admin/menu/${item.id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      name: item.name,
      price: item.priceCents / 100,
      isActive: item.isActive,
    }),
  });
}

export async function deleteAdminBooking(token: string, id: number) {
  return apiRequest<void>(`/api/admin/bookings/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function cancelAdminOrder(token: string, id: number) {
  return apiRequest<void>(`/api/admin/orders/${id}/cancel`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
}
