const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmailAddress(value: string) {
  const email = normalizeEmailAddress(value);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address (up to 254 characters).";
  }
  return null;
}

export function validatePassword(value: string) {
  if (value.length < 8 || value.length > 128) {
    return "Your password must be between 8 and 128 characters.";
  }
  return null;
}

export function validatePersonName(value: string) {
  const name = value.trim();
  if (!name) {
    return "Enter a name for the booking.";
  }
  if (name.length > 120) {
    return "The name must be 120 characters or fewer.";
  }
  return null;
}

export function parseReservationId(value: string) {
  const id = value.trim();
  if (!/^[1-9]\d{0,18}$/.test(id)) {
    return null;
  }
  const reservationId = Number(id);
  return Number.isSafeInteger(reservationId) ? reservationId : null;
}
