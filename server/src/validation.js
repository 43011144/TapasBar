const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(1[0-6]):00$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const menuItems = new Map(
  require("./menuCatalog.json").map(({ id, name, priceCents }) => [
    id,
    { name, priceCents },
  ]),
);

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

function parsePartySize(value) {
  const partySize = Number(value);
  return Number.isInteger(partySize) && partySize >= 1 && partySize <= 255
    ? partySize
    : null;
}

function canAccommodateParty(table, partySize) {
  return partySize <= table.maxCapacity;
}

function validateCredentials(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  if (
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null;
  }

  return { email, password };
}

function validateFirstManagerSetup(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const credentials = validateCredentials(body);
  const setupCode = body.setupCode;
  if (
    !credentials ||
    typeof setupCode !== "string" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(setupCode)
  ) {
    return null;
  }
  return { ...credentials, setupCode };
}

function validateLogin(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const role = body.role;
  const password = body.password;
  if (
    !["customer", "staff", "manager"].includes(role) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null;
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (role === "staff") {
    return email.length <= 254 && EMAIL_PATTERN.test(email)
      ? { role, email, password }
      : null;
  }

  return email.length <= 254 && EMAIL_PATTERN.test(email)
    ? { role, email, password }
    : null;
}

function validateEmail(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

function validatePasswordReset(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = body.password;
  if (
    !/^[A-Za-z0-9_-]{40,64}$/.test(token) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null;
  }
  return { token, password };
}

function validateStaffAccount(body) {
  const account = validateManagedAccount(body);
  return account && account.role === "staff"
    ? { email: account.email, password: account.password }
    : null;
}

function validateManagedAccount(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const role = body.role;
  if (role !== "staff" && role !== "manager") {
    return null;
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;
  if (
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null;
  }
  return { email, password, role };
}

function validateAvailabilityQuery(query) {
  const partySize = parsePartySize(query.partySize);
  if (!isValidDate(query.date) || !isValidTime(query.time) || partySize === null) {
    return null;
  }

  return { date: query.date, time: query.time, partySize };
}

function validateReservation(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const tableId = Number(body.tableId);
  const partySize = parsePartySize(body.partySize);
  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail =
    typeof body.customerEmail === "string"
      ? body.customerEmail.trim().toLowerCase()
      : "";

  if (
    !isValidDate(body.date) ||
    !isValidTime(body.time) ||
    !Number.isInteger(tableId) ||
    tableId < 1 ||
    partySize === null ||
    customerName.length < 1 ||
    customerName.length > 120 ||
    customerEmail.length > 254 ||
    !EMAIL_PATTERN.test(customerEmail)
  ) {
    return null;
  }

  return {
    tableId,
    date: body.date,
    time: body.time,
    partySize,
    customerName,
    customerEmail,
  };
}

function validateReservationCancellation(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const reservationId = Number(body.reservationId);
  const customerEmail =
    typeof body.customerEmail === "string"
      ? body.customerEmail.trim().toLowerCase()
      : "";

  if (
    !Number.isInteger(reservationId) ||
    reservationId < 1 ||
    customerEmail.length > 254 ||
    !EMAIL_PATTERN.test(customerEmail)
  ) {
    return null;
  }

  return {
    reservationId,
    customerEmail,
  };
}

function validateOrder(body, overrides = new Map()) {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 50
  ) {
    return null;
  }

  const items = [];
  let totalCents = 0;
  for (const item of body.items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return null;
    }
    const id = typeof item.id === "string" ? item.id : "";
    const quantity = Number(item.quantity);
    const catalogItem = menuItems.get(id);
    if (!catalogItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return null;
    }

    const override = overrides.get(id);
    if (override?.isActive === false) {
      return null;
    }
    const name = override?.name ?? catalogItem.name;
    const priceCents = override?.priceCents ?? catalogItem.priceCents;
    const lineTotalCents = priceCents * quantity;
    totalCents += lineTotalCents;
    if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) {
      return null;
    }
    items.push({
      id,
      name,
      quantity,
      priceCents,
      lineTotalCents,
    });
  }

  return { items, totalCents };
}

function validateCheckout(body, overrides = new Map()) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const customerEmail =
    typeof body.customerEmail === "string"
      ? body.customerEmail.trim().toLowerCase()
      : "";
  if (customerEmail.length > 254 || !EMAIL_PATTERN.test(customerEmail)) {
    return null;
  }
  const order = validateOrder(body, overrides);
  return order ? { ...order, customerEmail } : null;
}

module.exports = {
  isValidDate,
  isValidTime,
  canAccommodateParty,
  validateCredentials,
  validateFirstManagerSetup,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateStaffAccount,
  validateManagedAccount,
  validateAvailabilityQuery,
  validateReservation,
  validateReservationCancellation,
  validateOrder,
  validateCheckout,
};
