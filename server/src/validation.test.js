const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isValidDate,
  isValidTime,
  canAccommodateParty,
  validateCredentials,
  validateFirstManagerSetup,
  validateLogin,
  validateManagedAccount,
  validateAvailabilityQuery,
  validateReservation,
  validateReservationCancellation,
  validateOrder,
  validateCheckout,
} = require("./validation");

test("allows small parties at a table and enforces its maximum capacity", () => {
  const table = { minCapacity: 3, maxCapacity: 4 };
  assert.equal(canAccommodateParty(table, 1), true);
  assert.equal(canAccommodateParty(table, 2), true);
  assert.equal(canAccommodateParty(table, 3), true);
  assert.equal(canAccommodateParty(table, 4), true);
  assert.equal(canAccommodateParty(table, 5), false);
});

test("validates real calendar dates", () => {
  assert.equal(isValidDate("2026-09-28"), true);
  assert.equal(isValidDate("2026-02-30"), false);
});

test("only accepts hourly booking times from 10:00 through 16:00", () => {
  assert.equal(isValidTime("10:00"), true);
  assert.equal(isValidTime("16:00"), true);
  assert.equal(isValidTime("09:00"), false);
  assert.equal(isValidTime("16:30"), false);
});

test("validates table reservations and party sizes", () => {
  assert.deepEqual(
    validateReservation({
      tableId: 6,
      date: "2026-09-28",
      time: "10:00",
      partySize: 1,
      customerName: "  Tapas Guest ",
      customerEmail: " GUEST@example.com ",
    }),
    {
      tableId: 6,
      date: "2026-09-28",
      time: "10:00",
      partySize: 1,
      customerName: "Tapas Guest",
      customerEmail: "guest@example.com",
    },
  );
  assert.equal(
    validateReservation({
      tableId: 6,
      date: "2026-09-28",
      time: "09:00",
      partySize: 1,
      customerName: "Tapas Guest",
      customerEmail: "guest@example.com",
    }),
    null,
  );
  assert.equal(validateReservation(null), null);
  assert.equal(
    validateAvailabilityQuery({
      date: "2026-09-28",
      time: "11:00",
      partySize: "256",
    }),
    null,
  );
  assert.deepEqual(
    validateAvailabilityQuery({
      date: "2026-09-28",
      time: "11:00",
      partySize: "255",
    }),
    { date: "2026-09-28", time: "11:00", partySize: 255 },
  );
});

test("validates reservation cancellation requests", () => {
  assert.deepEqual(
    validateReservationCancellation({
      reservationId: "42",
      customerEmail: "  Guest@example.com ",
    }),
    { reservationId: 42, customerEmail: "guest@example.com" },
  );
  assert.equal(
    validateReservationCancellation({
      reservationId: 0,
      customerEmail: "guest@example.com",
    }),
    null,
  );
  assert.equal(
    validateReservationCancellation({
      reservationId: 7,
      customerEmail: "not-an-email",
    }),
    null,
  );
});

test("validates order items and calculates totals in integer cents", () => {
  assert.deepEqual(
    validateOrder({
      items: [
        { id: "f2", quantity: 2 },
        { id: "d1", quantity: 1 },
      ],
    }),
    {
      items: [
        {
          id: "f2",
          name: "Tripple Cheese Burger",
          quantity: 2,
          priceCents: 7500,
          lineTotalCents: 15000,
        },
        {
          id: "d1",
          name: "Black Label 300ml",
          quantity: 1,
          priceCents: 2800,
          lineTotalCents: 2800,
        },
      ],
      totalCents: 17800,
    },
  );
});

test("uses manager menu overrides for order prices and availability", () => {
  const overrides = new Map([
    ["f2", { name: "Updated Burger", priceCents: 8200, isActive: true }],
    ["d1", { name: "Unavailable Drink", priceCents: 2800, isActive: false }],
  ]);
  assert.deepEqual(
    validateOrder({ items: [{ id: "f2", quantity: 2 }] }, overrides),
    {
      items: [
        {
          id: "f2",
          name: "Updated Burger",
          quantity: 2,
          priceCents: 8200,
          lineTotalCents: 16400,
        },
      ],
      totalCents: 16400,
    },
  );
  assert.equal(
    validateOrder({ items: [{ id: "d1", quantity: 1 }] }, overrides),
    null,
  );
});

test("rejects invalid or empty orders", () => {
  assert.equal(validateOrder({ items: [] }), null);
  assert.equal(
    validateOrder({
      items: [{ id: "f2", quantity: 0 }],
    }),
    null,
  );
  assert.equal(
    validateOrder({
      items: [{ id: "unknown", quantity: 1 }],
    }),
    null,
  );
  assert.equal(
    validateOrder({
      items: [{ id: "f2", name: "Burger", price: 0.01, quantity: 1 }],
    })?.totalCents,
    7500,
  );
});

test("validates and normalizes the checkout email", () => {
  assert.deepEqual(
    validateCheckout({
      customerEmail: " Customer@Example.com ",
      items: [{ id: "f2", quantity: 1 }],
    }),
    {
      customerEmail: "customer@example.com",
      items: [
        {
          id: "f2",
          name: "Tripple Cheese Burger",
          quantity: 1,
          priceCents: 7500,
          lineTotalCents: 7500,
        },
      ],
      totalCents: 7500,
    },
  );
  assert.equal(
    validateCheckout({
      customerEmail: "not-an-email",
      items: [{ id: "f2", quantity: 1 }],
    }),
    null,
  );
});

test("validates and normalizes account credentials", () => {
  assert.deepEqual(
    validateCredentials({
      email: "  GUEST@example.com ",
      password: "secret123",
    }),
    { email: "guest@example.com", password: "secret123" },
  );
  assert.equal(
    validateCredentials({ email: "not-an-email", password: "secret123" }),
    null,
  );
  assert.equal(
    validateCredentials({ email: "guest@example.com", password: "secret1" }),
    null,
  );
  assert.equal(
    validateCredentials({ email: "guest@example.com", password: "123" }),
    null,
  );
});

test("validates staff login using the account email", () => {
  assert.deepEqual(
    validateLogin({
      role: "staff",
      email: "  STAFF@example.com ",
      password: "securepass",
    }),
    { role: "staff", email: "staff@example.com", password: "securepass" },
  );
  assert.equal(
    validateLogin({
      role: "staff",
      staffId: "STF-0123456789AB",
      password: "securepass",
    }),
    null,
  );
});

test("validates first-manager setup credentials and a high-entropy setup code", () => {
  const setupCode = "A".repeat(42);
  assert.deepEqual(
    validateFirstManagerSetup({
      email: "  MANAGER@example.com ",
      password: "securepass",
      setupCode,
    }),
    {
      email: "manager@example.com",
      password: "securepass",
      setupCode,
    },
  );
  assert.equal(
    validateFirstManagerSetup({
      email: "manager@example.com",
      password: "securepass",
      setupCode: "too-short",
    }),
    null,
  );
  assert.equal(
    validateFirstManagerSetup({
      email: "not-an-email",
      password: "securepass",
      setupCode,
    }),
    null,
  );
});

test("manager-created accounts are limited to staff and manager roles", () => {
  assert.deepEqual(
    validateManagedAccount({
      role: "manager",
      email: "  ADMIN@example.com ",
      password: "securepass",
    }),
    { role: "manager", email: "admin@example.com", password: "securepass" },
  );
  assert.deepEqual(
    validateManagedAccount({
      role: "staff",
      email: "staff@example.com",
      password: "securepass",
    }),
    { role: "staff", email: "staff@example.com", password: "securepass" },
  );
  assert.equal(
    validateManagedAccount({
      role: "customer",
      email: "guest@example.com",
      password: "securepass",
    }),
    null,
  );
  assert.equal(
    validateManagedAccount({
      role: "manager",
      email: "manager@example.com",
      password: "short",
    }),
    null,
  );
});
