const express = require("express");

const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");
const {
  acquireManagerSetupLock,
  getConnectionConfig,
  isUniqueConstraintViolation,
  pool,
  releaseManagerSetupLock,
} = require("./database");
const {
  canAccommodateParty,
  validateCredentials,
  validateFirstManagerSetup,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateManagedAccount,
  validateAvailabilityQuery,
  validateReservation,
  validateReservationCancellation,
  validateCheckout,
} = require("./validation");
const {
  hashPassword,
  hashToken,
  verifyPassword,
  createSession,
} = require("./auth");
const { sendOrderEmail, sendPasswordResetEmail } = require("./emailService");
const { createYocoCheckout } = require("./yocoService");
const { verifyYocoWebhook } = require("./yocoWebhook");
const { getProviderConfigurationIssues } = require("./providerConfig");
const menuCatalog = require("./menuCatalog.json");

const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT || 3000);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const allowAllOrigins = allowedOrigins.has("*");

const loginAttempts = new Map();
const managerSetupAttempts = new Map();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 10;
const maxManagerSetupAttempts = 5;
const managerSetupCodePattern = /^[A-Za-z0-9_-]{32,128}$/;

function isManagerSetupCodeConfigured() {
  return managerSetupCodePattern.test(process.env.MANAGER_SETUP_CODE || "");
}

function matchesManagerSetupCode(suppliedCode) {
  const expectedHash = createHash("sha256")
    .update(process.env.MANAGER_SETUP_CODE || "")
    .digest();
  const suppliedHash = createHash("sha256").update(suppliedCode).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (!origin) {
    return next();
  }

  if (!allowAllOrigins && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }

  res.setHeader("Access-Control-Allow-Origin", allowAllOrigins ? "*" : origin);
  if (!allowAllOrigins) {
    res.setHeader("Vary", "Origin");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.post(
  "/api/webhooks/yoco",
  express.raw({ type: "application/json", limit: "16kb" }),
  async (req, res) => {
    const webhookSecret = process.env.YOCO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res
        .status(503)
        .json({ error: "Yoco webhooks are not configured." });
    }
    if (
      !Buffer.isBuffer(req.body) ||
      !verifyYocoWebhook(req.body, req.headers, webhookSecret)
    ) {
      return res
        .status(401)
        .json({ error: "Yoco webhook signature is invalid." });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Yoco webhook body is invalid." });
    }
    if (event.type !== "payment.succeeded" && event.type !== "payment.failed") {
      return res.sendStatus(200);
    }

    const payment = event.payload;
    const orderId = Number(payment?.metadata?.orderId);
    if (
      !Number.isSafeInteger(orderId) ||
      orderId < 1 ||
      !Number.isSafeInteger(payment?.amount) ||
      payment.amount < 1 ||
      payment.currency !== "ZAR"
    ) {
      return res.status(400).json({ error: "Yoco payment event is invalid." });
    }

    let connection;
    let paidOrder;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        `SELECT o.customer_email AS customerEmail,
                o.total_amount AS totalAmount,
                o.order_email_sent_at AS orderEmailSentAt,
                o.paid_email_sent_at AS paidEmailSentAt
         FROM orders AS o
         JOIN payments AS p ON p.order_id = o.id
         WHERE o.id = ? AND p.provider_reference IS NOT NULL
         FOR UPDATE`,
        [orderId],
      );
      if (rows.length !== 1) {
        await connection.rollback();
        console.warn(
          `Ignoring Yoco payment event for unknown order ${orderId}.`,
        );
        return res.sendStatus(200);
      }

      const order = rows[0];
      const amountCents = Math.round(Number(order.totalAmount) * 100);
      if (payment.amount !== amountCents) {
        await connection.rollback();
        console.error(`Yoco amount mismatch for order ${orderId}.`);
        return res.sendStatus(200);
      }

      if (event.type === "payment.failed") {
        await connection.execute(
          `UPDATE payments SET status = 'failed'
           WHERE order_id = ? AND status = 'pending'`,
          [orderId],
        );
        await connection.commit();
        return res.sendStatus(200);
      }

      await connection.execute(
        `UPDATE payments SET status = 'paid'
         WHERE order_id = ? AND status = 'pending'`,
        [orderId],
      );
      await connection.execute(
        `UPDATE orders SET status = 'paid'
         WHERE id = ? AND status = 'pending'`,
        [orderId],
      );
      await connection.commit();

      if (order.paidEmailSentAt === null && order.customerEmail) {
        paidOrder = {
          id: orderId,
          email: order.customerEmail,
          total: Number(order.totalAmount).toFixed(2),
          orderEmailSentAt: order.orderEmailSentAt,
        };
      }
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Could not process Yoco payment notification:", error);
      return res
        .status(500)
        .json({ error: "Could not process payment notification." });
    } finally {
      connection?.release();
    }

    if (paidOrder) {
      try {
        if (paidOrder.orderEmailSentAt === null) {
          await sendOrderEmail({
            to: paidOrder.email,
            orderId: paidOrder.id,
            total: paidOrder.total,
            paid: false,
          });
          await pool.execute(
            `UPDATE orders SET order_email_sent_at = CURRENT_TIMESTAMP
             WHERE id = ? AND order_email_sent_at IS NULL`,
            [paidOrder.id],
          );
        }
        await sendOrderEmail({
          to: paidOrder.email,
          orderId: paidOrder.id,
          total: paidOrder.total,
          paid: true,
        });
        await pool.execute(
          `UPDATE orders SET paid_email_sent_at = CURRENT_TIMESTAMP
           WHERE id = ? AND paid_email_sent_at IS NULL`,
          [paidOrder.id],
        );
      } catch (error) {
        console.error(
          `Could not send paid confirmation for order ${paidOrder.id}:`,
          error,
        );
        return res
          .status(500)
          .json({ error: "Could not send payment confirmation." });
      }
    }
    return res.sendStatus(200);
  },
);

app.use(express.json({ limit: "16kb" }));

async function authenticate(req, res, next) {
  const authorization = req.get("Authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(authorization);
  if (!match) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.staff_id AS staffId
       FROM auth_sessions AS s
       JOIN users AS u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [hashToken(match[1])],
    );
    if (users.length !== 1) {
      return res
        .status(401)
        .json({ error: "Your session has expired. Sign in again." });
    }
    req.authToken = match[1];
    req.authUser = {
      id: users[0].id,
      email: users[0].email,
      role: users[0].role,
      ...(users[0].role === "staff" ? { staffId: users[0].staffId } : {}),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to do that." });
    }
    return next();
  };
}

app.get("/healthz", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok" });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/tables", async (req, res, next) => {
  try {
    const floorNumber = req.query.floor ? Number(req.query.floor) : null;
    if (
      floorNumber !== null &&
      (!Number.isInteger(floorNumber) || floorNumber < 1 || floorNumber > 255)
    ) {
      return res
        .status(400)
        .json({ error: "floor must be a positive integer." });
    }

    const [tables] = await pool.execute(
      `SELECT id, floor_number AS floorNumber,
              min_capacity AS minCapacity, max_capacity AS maxCapacity
       FROM restaurant_tables
       WHERE is_active = TRUE AND (?::integer IS NULL OR floor_number = ?)
       ORDER BY floor_number, id`,
      [floorNumber, floorNumber],
    );
    return res.json({ tables });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  const credentials = validateCredentials(req.body);
  if (!credentials) {
    return res.status(400).json({ error: "Account details are invalid." });
  }

  let connection;
  try {
    const { salt, hash } = await hashPassword(credentials.password);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, password_salt, role)
       VALUES (?, ?, ?, 'customer')`,
      [credentials.email, hash, salt],
    );
    const token = await createSession(connection, result.insertId);
    await connection.commit();
    return res.status(201).json({
      token,
      user: { id: result.insertId, email: credentials.email, role: "customer" },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    if (isUniqueConstraintViolation(error)) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  const credentials = validateLogin(req.body);
  if (!credentials) {
    return res.status(400).json({ error: "Login details are invalid." });
  }
  const identifier = credentials.email;
  const attemptKey = req.ip;
  const now = Date.now();
  const previousAttempts = loginAttempts.get(attemptKey);
  const activeAttempts =
    previousAttempts && now - previousAttempts.startedAt < loginWindowMs
      ? previousAttempts
      : { startedAt: now, count: 0 };
  if (activeAttempts.count >= maxLoginAttempts) {
    res.setHeader("Retry-After", Math.ceil(loginWindowMs / 1000));
    return res.status(429).json({
      error: "Too many sign-in attempts. Please try again in 15 minutes.",
    });
  }
  activeAttempts.count += 1;
  loginAttempts.set(attemptKey, activeAttempts);

  try {
    const [users] = await pool.execute(
      `SELECT id, email, staff_id AS staffId,
              password_hash AS passwordHash,
              password_salt AS passwordSalt, role
       FROM users WHERE email = ? AND role = ? LIMIT 1`,
      [identifier, credentials.role],
    );
    const user = users[0];
    const verified = user
      ? await verifyPassword(
          credentials.password,
          user.passwordSalt,
          user.passwordHash,
        )
      : await verifyPassword(
          credentials.password,
          "00000000000000000000000000000000",
          "0".repeat(128),
        );
    if (!user || !verified) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    loginAttempts.delete(attemptKey);

    const connection = await pool.getConnection();
    try {
      const token = await createSession(connection, user.id);
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          ...(user.role === "staff" ? { staffId: user.staffId } : {}),
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    return next(error);
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  return res.json({ user: req.authUser });
});

app.get("/api/auth/manager-setup", async (_req, res, next) => {
  if (!isManagerSetupCodeConfigured()) {
    return res.json({ available: false, configured: false });
  }
  try {
    const [managers] = await pool.execute(
      "SELECT id FROM users WHERE role = 'manager' LIMIT 1",
    );
    return res.json({
      available: managers.length === 0,
      configured: true,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/manager-setup", async (req, res, next) => {
  if (!isManagerSetupCodeConfigured()) {
    return res.status(503).json({
      error: "First manager setup is not enabled on this server.",
    });
  }
  const setup = validateFirstManagerSetup(req.body);
  if (!setup) {
    return res.status(400).json({
      error: "Provide a valid email, password, and manager setup code.",
    });
  }

  const attemptKey = req.ip;
  const now = Date.now();
  const previousAttempts = managerSetupAttempts.get(attemptKey);
  const activeAttempts =
    previousAttempts && now - previousAttempts.startedAt < loginWindowMs
      ? previousAttempts
      : { startedAt: now, count: 0 };
  if (activeAttempts.count >= maxManagerSetupAttempts) {
    res.setHeader("Retry-After", Math.ceil(loginWindowMs / 1000));
    return res.status(429).json({
      error: "Too many setup attempts. Please try again in 15 minutes.",
    });
  }
  activeAttempts.count += 1;
  managerSetupAttempts.set(attemptKey, activeAttempts);

  if (!matchesManagerSetupCode(setup.setupCode)) {
    return res
      .status(403)
      .json({ error: "Manager setup could not be verified." });
  }

  let connection;
  let lockAcquired = false;
  try {
    connection = await pool.getConnection();
    lockAcquired = await acquireManagerSetupLock(connection);
    if (!lockAcquired) {
      return res.status(503).json({
        error: "Manager setup is busy. Please try again.",
      });
    }

    const [managers] = await connection.execute(
      "SELECT id FROM users WHERE role = 'manager' LIMIT 1",
    );
    if (managers.length > 0) {
      return res.status(409).json({
        error: "First manager setup has already been completed.",
      });
    }

    const { salt, hash } = await hashPassword(setup.password);
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO users (email, password_hash, password_salt, role, staff_id)
       VALUES (?, ?, ?, 'manager', NULL)`,
      [setup.email, hash, salt],
    );
    const token = await createSession(connection, result.insertId);
    await connection.commit();
    managerSetupAttempts.delete(attemptKey);
    return res.status(201).json({
      token,
      user: {
        id: result.insertId,
        email: setup.email,
        role: "manager",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    if (isUniqueConstraintViolation(error)) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }
    return next(error);
  } finally {
    if (connection && lockAcquired) {
      await releaseManagerSetupLock(connection);
    }
    connection?.release();
  }
});

app.post("/api/auth/logout", authenticate, async (req, res, next) => {
  const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(
    req.get("Authorization") ?? "",
  );
  if (!match) {
    return res.status(401).json({ error: "Sign in to continue." });
  }
  try {
    await pool.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [
      hashToken(match[1]),
    ]);
    return res.sendStatus(204);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/forgot-password", async (req, res, next) => {
  const email = validateEmail(req.body);
  if (!email) {
    return res
      .status(400)
      .json({ error: "Enter a valid account email address." });
  }

  try {
    const [users] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (users.length === 1) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(token);
      await pool.execute(
        "DELETE FROM password_reset_tokens WHERE user_id = ?",
        [users[0].id],
      );
      const [result] = await pool.execute(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '60 minutes')`,
        [users[0].id, tokenHash],
      );
      const baseUrl = (
        process.env.APP_PUBLIC_URL || "tapasbar://reset-password"
      ).replace(/\/+$/, "");
      const resetUrl = baseUrl.startsWith("tapasbar://")
        ? `${baseUrl}?token=${encodeURIComponent(token)}`
        : `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await sendPasswordResetEmail({ to: email, resetUrl });
      } catch (emailError) {
        await pool.execute("DELETE FROM password_reset_tokens WHERE id = ?", [
          result.insertId,
        ]);
        console.error("Could not send password reset email:", emailError);
      }
    }
    return res.json({
      message:
        "If an account exists for that address, a password reset link will be sent.",
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/reset-password", async (req, res, next) => {
  const reset = validatePasswordReset(req.body);
  if (!reset) {
    return res.status(400).json({
      error:
        "Provide a valid reset link and a password with at least 8 characters.",
    });
  }

  let connection;
  try {
    const { salt, hash } = await hashPassword(reset.password);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [tokens] = await connection.execute(
      `SELECT id, user_id AS userId FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [hashToken(reset.token)],
    );
    if (tokens.length !== 1) {
      await connection.rollback();
      return res.status(400).json({
        error: "This reset link is invalid or expired. Request a new one.",
      });
    }
    const resetToken = tokens[0];
    await connection.execute(
      `UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?`,
      [hash, salt, resetToken.userId],
    );
    await connection.execute(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
      [resetToken.id],
    );
    await connection.execute("DELETE FROM auth_sessions WHERE user_id = ?", [
      resetToken.userId,
    ]);
    await connection.commit();
    return res.json({ message: "Password updated. Please sign in again." });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

app.get(
  "/api/admin/bookings",
  authenticate,
  requireRole("staff", "manager"),
  async (_req, res, next) => {
    try {
      const [bookings] = await pool.execute(
        `SELECT r.id, r.booking_date AS date, r.booking_time AS time,
                r.table_id AS tableId, t.floor_number AS floorNumber,
                r.party_size AS partySize, r.customer_name AS customerName,
                r.customer_email AS customerEmail, r.created_at AS createdAt
         FROM reservations AS r
         JOIN restaurant_tables AS t ON t.id = r.table_id
         ORDER BY r.booking_date DESC, r.booking_time DESC, r.id DESC
         LIMIT 500`,
      );
      return res.json({ bookings });
    } catch (error) {
      return next(error);
    }
  },
);

app.get(
  "/api/admin/orders",
  authenticate,
  requireRole("staff", "manager"),
  async (_req, res, next) => {
    try {
      const [orders] = await pool.execute(
        `SELECT o.id, o.customer_email AS customerEmail,
                o.total_amount AS totalAmount, o.currency, o.status,
                o.created_at AS createdAt,
                p.status AS paymentStatus, p.provider_reference AS paymentReference
         FROM orders AS o
         LEFT JOIN payments AS p ON p.order_id = o.id
         ORDER BY o.created_at DESC
         LIMIT 500`,
      );
      const orderIds = orders.map((order) => order.id);
      let itemsByOrder = new Map();
      if (orderIds.length > 0) {
        const placeholders = orderIds.map(() => "?").join(", ");
        const [items] = await pool.execute(
          `SELECT order_id AS orderId, item_name AS itemName,
                  quantity, unit_price AS unitPrice, line_total AS lineTotal
           FROM order_items WHERE order_id IN (${placeholders})
           ORDER BY order_id, id`,
          orderIds,
        );
        itemsByOrder = items.reduce((result, item) => {
          const currentItems = result.get(item.orderId) ?? [];
          currentItems.push(item);
          result.set(item.orderId, currentItems);
          return result;
        }, new Map());
      }
      return res.json({
        orders: orders.map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
        })),
      });
    } catch (error) {
      return next(error);
    }
  },
);

app.get(
  "/api/admin/menu",
  authenticate,
  requireRole("manager"),
  async (_req, res, next) => {
    try {
      const [overrides] = await pool.execute(
        `SELECT menu_item_id AS id, item_name AS name,
              price_cents AS priceCents, is_active AS isActive
       FROM menu_overrides ORDER BY menu_item_id`,
      );
      const overridesById = new Map(
        overrides.map((item) => [
          item.id,
          {
            ...item,
            priceCents: Number(item.priceCents),
            isActive: Boolean(item.isActive),
          },
        ]),
      );
      const items = menuCatalog.map((item) => ({
        ...item,
        ...(overridesById.get(item.id) ?? {}),
        isActive: overridesById.get(item.id)?.isActive ?? true,
      }));
      return res.json({ items });
    } catch (error) {
      return next(error);
    }
  },
);

app.post(
  "/api/admin/accounts",
  authenticate,
  requireRole("manager"),
  async (req, res, next) => {
    const account = validateManagedAccount(req.body);
    if (!account) {
      return res.status(400).json({
        error: "Provide a valid staff or manager role, email, and password.",
      });
    }
    try {
      const { salt, hash } = await hashPassword(account.password);
      const staffId =
        account.role === "staff"
          ? `STF-${randomBytes(6).toString("hex").toUpperCase()}`
          : null;
      const [result] = await pool.execute(
        `INSERT INTO users (email, password_hash, password_salt, role, staff_id)
         VALUES (?, ?, ?, ?, ?)`,
        [account.email, hash, salt, account.role, staffId],
      );
      return res.status(201).json({
        user: {
          id: result.insertId,
          email: account.email,
          role: account.role,
          ...(staffId ? { staffId } : {}),
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return res.status(409).json({
          error: "An account with this email already exists.",
        });
      }
      return next(error);
    }
  },
);

app.put(
  "/api/admin/menu/:id",
  authenticate,
  requireRole("manager"),
  async (req, res, next) => {
    const itemId = req.params.id;
    const catalogItem = require("./menuCatalog.json").find(
      (item) => item.id === itemId,
    );
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const price = Number(req.body?.price);
    const priceCents = Math.round(price * 100);
    const isActive = req.body?.isActive;
    if (
      !catalogItem ||
      !name ||
      name.length > 120 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 99999999.99 ||
      Math.abs(price * 100 - priceCents) > 0.0001 ||
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({ error: "Menu item details are invalid." });
    }
    try {
      await pool.execute(
        `INSERT INTO menu_overrides
           (menu_item_id, item_name, price_cents, is_active)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (menu_item_id) DO UPDATE SET
           item_name = EXCLUDED.item_name,
           price_cents = EXCLUDED.price_cents,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP`,
        [itemId, name, priceCents, isActive],
      );
      return res.json({
        item: { id: itemId, name, priceCents, isActive },
      });
    } catch (error) {
      return next(error);
    }
  },
);

app.get("/api/menu/overrides", async (_req, res, next) => {
  try {
    const [overrides] = await pool.execute(
      `SELECT menu_item_id AS id, item_name AS name,
              price_cents AS priceCents, is_active AS isActive
       FROM menu_overrides`,
    );
    return res.json({ overrides });
  } catch (error) {
    return next(error);
  }
});

app.delete(
  "/api/admin/bookings/:id",
  authenticate,
  requireRole("manager"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Booking ID is invalid." });
    }
    try {
      const [result] = await pool.execute(
        "DELETE FROM reservations WHERE id = ?",
        [id],
      );
      if (result.affectedRows !== 1) {
        return res.status(404).json({ error: "Booking not found." });
      }
      return res.sendStatus(204);
    } catch (error) {
      return next(error);
    }
  },
);

app.patch(
  "/api/admin/orders/:id/cancel",
  authenticate,
  requireRole("manager"),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Order ID is invalid." });
    }
    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [orders] = await connection.execute(
          `SELECT status FROM orders WHERE id = ? FOR UPDATE`,
          [id],
        );
        if (orders.length !== 1) {
          await connection.rollback();
          return res.status(404).json({ error: "Order not found." });
        }
        if (orders[0].status !== "pending") {
          await connection.rollback();
          return res.status(409).json({
            error: "Only pending orders can be cancelled.",
          });
        }
        await connection.execute(
          `UPDATE orders SET status = 'cancelled' WHERE id = ?`,
          [id],
        );
        await connection.execute(
          `UPDATE payments SET status = 'cancelled'
           WHERE order_id = ? AND status = 'pending'`,
          [id],
        );
        await connection.commit();
        return res.sendStatus(204);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      return next(error);
    }
  },
);

app.get("/api/availability", async (req, res, next) => {
  const query = validateAvailabilityQuery(req.query);
  if (!query) {
    return res.status(400).json({
      error:
        "Provide a valid date, hourly time from 10:00 to 16:00, and partySize from 1 to 255.",
    });
  }

  try {
    const [tables] = await pool.execute(
      `SELECT t.id, t.floor_number AS floorNumber,
              t.min_capacity AS minCapacity, t.max_capacity AS maxCapacity
       FROM restaurant_tables AS t
       LEFT JOIN reservations AS r
         ON r.table_id = t.id
        AND r.booking_date = ?
        AND r.booking_time = ?
       WHERE t.is_active = TRUE
         AND r.id IS NULL
       ORDER BY t.floor_number, t.id`,
      [query.date, query.time],
    );
    return res.json({
      tables: tables.filter((table) =>
        canAccommodateParty(table, query.partySize),
      ),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/orders/checkout", async (req, res, next) => {
  let menuOverrides;
  try {
    const [rows] = await pool.execute(
      `SELECT menu_item_id AS id, item_name AS name,
              price_cents AS priceCents, is_active AS isActive
       FROM menu_overrides`,
    );
    menuOverrides = new Map(
      rows.map((item) => [
        item.id,
        { ...item, isActive: Boolean(item.isActive) },
      ]),
    );
  } catch (error) {
    return next(error);
  }
  const order = validateCheckout(req.body, menuOverrides);
  if (!order) {
    return res.status(400).json({
      error:
        "Provide a valid email address and valid menu items for the order.",
    });
  }
  const configurationIssues = getProviderConfigurationIssues();
  if (configurationIssues.length > 0) {
    return res.status(503).json({
      error: `Checkout is not configured: ${configurationIssues.join("; ")}. Add the provider settings to the root .env and restart the booking-api.`,
    });
  }

  let connection;
  let checkout;
  let orderId;
  let paymentId;
  const totalAmount = (order.totalCents / 100).toFixed(2);
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customer_email, total_amount, currency, status)
       VALUES (?, ?, 'ZAR', 'pending')`,
      [order.customerEmail, totalAmount],
    );

    orderId = orderResult.insertId;
    const itemPlaceholders = order.items
      .map(() => "(?, ?, ?, ?, ?, ?)")
      .join(", ");
    const itemValues = order.items.flatMap((item) => [
      orderId,
      item.id,
      item.name,
      item.quantity,
      (item.priceCents / 100).toFixed(2),
      (item.lineTotalCents / 100).toFixed(2),
    ]);
    await connection.execute(
      `INSERT INTO order_items
         (order_id, menu_item_id, item_name, quantity, unit_price, line_total)
       VALUES ${itemPlaceholders}`,
      itemValues,
    );

    const [paymentResult] = await connection.execute(
      `INSERT INTO payments (order_id, amount, currency, method, status)
       VALUES (?, ?, 'ZAR', 'yoco', 'pending')`,
      [orderId, totalAmount],
    );
    paymentId = paymentResult.insertId;

    checkout = await createYocoCheckout({
      amountCents: order.totalCents,
      orderId,
    });
    await connection.execute(
      `UPDATE payments SET provider_reference = ? WHERE id = ?`,
      [checkout.id, paymentId],
    );

    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return next(error);
  } finally {
    connection?.release();
  }

  let emailSent = false;
  try {
    await sendOrderEmail({
      to: order.customerEmail,
      orderId,
      total: totalAmount,
      paid: false,
    });
    await pool.execute(
      `UPDATE orders SET order_email_sent_at = CURRENT_TIMESTAMP
       WHERE id = ? AND order_email_sent_at IS NULL`,
      [orderId],
    );
    emailSent = true;
  } catch (error) {
    console.error(
      `Could not send order confirmation for order ${orderId}:`,
      error,
    );
  }

  return res.status(201).json({
    order: {
      id: orderId,
      total: totalAmount,
      currency: "ZAR",
      status: "pending",
    },
    payment: {
      id: paymentId,
      status: "pending",
      method: "yoco",
    },
    checkout: { redirectUrl: checkout.redirectUrl },
    emailSent,
  });
});

app.post("/api/reservations", async (req, res, next) => {
  const reservation = validateReservation(req.body);
  if (!reservation) {
    return res.status(400).json({ error: "Reservation details are invalid." });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO reservations
         (table_id, booking_date, booking_time, party_size,
          customer_name, customer_email)
       SELECT t.id, ?, ?, ?, ?, ?
       FROM restaurant_tables AS t
       WHERE t.id = ? AND t.is_active = TRUE
         AND t.max_capacity >= ?`,
      [
        reservation.date,
        reservation.time,
        reservation.partySize,
        reservation.customerName,
        reservation.customerEmail,
        reservation.tableId,
        reservation.partySize,
      ],
    );

    if (result.affectedRows !== 1) {
      return res.status(409).json({
        error: "That table is no longer available or cannot fit this party.",
      });
    }

    return res.status(201).json({
      reservation: {
        id: result.insertId,
        tableId: reservation.tableId,
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
      },
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return res.status(409).json({
        error:
          "That table was just booked for this time. Choose another available table.",
      });
    }
    return next(error);
  }
});

app.post("/api/reservations/cancel", async (req, res, next) => {
  const cancellation = validateReservationCancellation(req.body);
  if (!cancellation) {
    return res.status(400).json({
      error: "Provide a valid reservation ID and the booking email.",
    });
  }

  try {
    const [result] = await pool.execute(
      `DELETE FROM reservations
       WHERE id = ? AND LOWER(customer_email) = ?`,
      [cancellation.reservationId, cancellation.customerEmail],
    );

    if (result.affectedRows !== 1) {
      return res.status(404).json({
        error: "Reservation not found for this email address.",
      });
    }

    return res.json({
      cancelled: true,
      reservationId: cancellation.reservationId,
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error("Booking API request failed:", error);
  return res
    .status(500)
    .json({ error: "Booking service is temporarily unavailable." });
});

async function start() {
  const databaseConfig = getConnectionConfig();
  if (!databaseConfig.connectionString && !databaseConfig.host) {
    throw new Error(
      "Set DATABASE_URL or all PGHOST, PGPORT, PGUSER, PGPASSWORD, and PGDATABASE variables.",
    );
  }

  await pool.query("SELECT 1");
  app.listen(port, () => {
    console.log(`Booking API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Could not start the booking API:", error);
  process.exitCode = 1;
});
