import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import {
  cancelAdminOrder,
  createManagedAccount,
  deleteAdminBooking,
  getAdminBookings,
  getAdminMenu,
  getAdminOrders,
  updateAdminMenuItem,
  type AdminBooking,
  type AdminMenuItem,
  type AdminOrder,
} from "../services/adminService";
import {
  normalizeEmailAddress,
  validateEmailAddress,
  validatePassword,
} from "../utils/validation";

function fetchDashboardData(token: string, isManager: boolean) {
  return Promise.all([
    getAdminBookings(token),
    getAdminOrders(token),
    isManager ? getAdminMenu(token) : Promise.resolve({ items: [] }),
  ]);
}

export default function AdminScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const { user, token } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [menu, setMenu] = useState<AdminMenuItem[]>([]);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"staff" | "manager">("staff");
  const [createdAccountEmail, setCreatedAccountEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isStaff = user?.role === "staff";
  const isManager = user?.role === "manager";
  const canAccess = isStaff || isManager;

  const loadDashboard = useCallback(async () => {
    if (!token || !canAccess) {
      return;
    }
    try {
      const [bookingResponse, orderResponse, menuResponse] =
        await fetchDashboardData(token, isManager);
      setBookings(bookingResponse.bookings);
      setOrders(orderResponse.orders);
      setMenu(menuResponse.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the staff dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [canAccess, isManager, token]);

  useEffect(() => {
    if (!token || !canAccess) {
      return;
    }
    let isCurrent = true;
    void fetchDashboardData(token, isManager)
      .then(([bookingResponse, orderResponse, menuResponse]) => {
        if (!isCurrent) return;
        setBookings(bookingResponse.bookings);
        setOrders(orderResponse.orders);
        setMenu(menuResponse.items);
      })
      .catch((loadError: unknown) => {
        if (!isCurrent) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the staff dashboard.",
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [canAccess, isManager, token]);

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    setBusyKey(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setConfirmKey("");
      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The requested change could not be saved.",
      );
    } finally {
      setBusyKey("");
    }
  };

  const createAccount = async () => {
    const emailError = validateEmailAddress(accountEmail);
    const passwordError = validatePassword(accountPassword);
    if (emailError || passwordError || !token) {
      setError(emailError ?? passwordError ?? "Sign in again to continue.");
      setNotice("");
      return;
    }
    setBusyKey("staff");
    setError("");
    setNotice("");
    setCreatedAccountEmail("");
    try {
      const response = await createManagedAccount(
        token,
        normalizeEmailAddress(accountEmail),
        accountPassword,
        newAccountRole,
      );
      setCreatedAccountEmail(response.user.email ?? "");
      setAccountEmail("");
      setAccountPassword("");
      setNotice(
        `${newAccountRole === "staff" ? "Staff" : "Manager"} account created for ${response.user.email}.`,
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the staff account.",
      );
    } finally {
      setBusyKey("");
    }
  };

  const saveMenuItem = async (item: AdminMenuItem) => {
    if (!token) {
      setError("Sign in again to continue.");
      return;
    }
    await runAction(
      `menu-${item.id}`,
      async () => {
        const response = await updateAdminMenuItem(token, item);
        setMenu((current) =>
          current.map((entry) =>
            entry.id === response.item.id ? response.item : entry,
          ),
        );
      },
      `${item.name} updated.`,
    );
  };

  if (!canAccess) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Staff dashboard" subtitle="This area is restricted." />
        <View style={styles.content}>
          <Text style={styles.message}>
            Sign in with an authorized staff or manager account to continue.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.button}>
            <Text style={styles.buttonText}>Return to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="Staff dashboard"
        subtitle={isManager ? "Manager tools & operations" : "Bookings & orders"}
      />
      <View style={styles.content}>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!!createdAccountEmail && (
          <View style={styles.highlight}>
            <Text style={styles.cardTitle}>New account email</Text>
            <Text selectable style={styles.staffId}>{createdAccountEmail}</Text>
            <Text style={styles.description}>
              Share this email securely with the employee. They will use it
              with their password to sign in.
            </Text>
          </View>
        )}
        {isManager && (
          <>
            <Text style={styles.sectionTitle}>Create an account</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Account type</Text>
              <View style={styles.roleOptions}>
                {(["staff", "manager"] as const).map((role) => (
                  <Pressable
                    key={role}
                    accessibilityRole="button"
                    accessibilityState={{ selected: newAccountRole === role }}
                    onPress={() => setNewAccountRole(role)}
                    style={[
                      styles.roleOption,
                      newAccountRole === role && styles.roleOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newAccountRole === role && styles.roleOptionTextActive,
                      ]}
                    >
                      {role === "staff" ? "Staff" : "Manager"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Account email</Text>
              <TextInput
                accessibilityLabel="Account email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                maxLength={254}
                onChangeText={setAccountEmail}
                placeholder="employee@example.com"
                placeholderTextColor={colors.mutedLight}
                style={styles.input}
                value={accountEmail}
              />
              <Text style={styles.label}>Temporary password</Text>
              <TextInput
                accessibilityLabel="Temporary password"
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={128}
                onChangeText={setAccountPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.mutedLight}
                secureTextEntry
                style={styles.input}
                value={accountPassword}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busyKey === "staff"}
                onPress={() => void createAccount()}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {busyKey === "staff"
                    ? "Creating…"
                    : `Create ${newAccountRole} account`}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {isLoading ? (
          <Text style={styles.message}>Loading staff dashboard…</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Bookings ({bookings.length})</Text>
            {bookings.length === 0 ? (
              <Text style={styles.empty}>There are no bookings to show.</Text>
            ) : bookings.map((booking) => {
              const actionKey = `booking-${booking.id}`;
              return (
                <View key={booking.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Booking #{booking.id} · {booking.customerName}
                  </Text>
                  <Text style={styles.description}>
                    {booking.date} at {booking.time} · Table {booking.tableId}
                    {" · "}Floor {booking.floorNumber} · {booking.partySize} guests
                  </Text>
                  <Text style={styles.description}>{booking.customerEmail}</Text>
                  {isManager && (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === actionKey}
                      onPress={() => {
                        if (confirmKey !== actionKey) {
                          setConfirmKey(actionKey);
                          return;
                        }
                        void runAction(
                          actionKey,
                          async () => {
                            if (!token) throw new Error("Sign in again to continue.");
                            await deleteAdminBooking(token, booking.id);
                          },
                          `Booking #${booking.id} cancelled.`,
                        );
                      }}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionText}>
                        {busyKey === actionKey
                          ? "Cancelling…"
                          : confirmKey === actionKey
                            ? "Confirm cancel booking"
                            : "Cancel booking"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>Orders ({orders.length})</Text>
            {orders.length === 0 ? (
              <Text style={styles.empty}>There are no orders to show.</Text>
            ) : orders.map((order) => {
              const actionKey = `order-${order.id}`;
              return (
                <View key={order.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Order #{order.id} · {order.currency} {Number(order.totalAmount).toFixed(2)}
                  </Text>
                  <Text style={styles.description}>
                    {order.status} · Payment: {order.paymentStatus ?? "unavailable"}
                  </Text>
                  <Text style={styles.description}>{order.customerEmail}</Text>
                  {order.items.map((item, index) => (
                    <Text key={`${order.id}-${index}`} style={styles.description}>
                      {item.quantity} × {item.itemName} · {order.currency} {item.lineTotal}
                    </Text>
                  ))}
                  {isManager && order.status === "pending" && (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === actionKey}
                      onPress={() => {
                        if (confirmKey !== actionKey) {
                          setConfirmKey(actionKey);
                          return;
                        }
                        void runAction(
                          actionKey,
                          async () => {
                            if (!token) throw new Error("Sign in again to continue.");
                            await cancelAdminOrder(token, order.id);
                          },
                          `Order #${order.id} cancelled.`,
                        );
                      }}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionText}>
                        {busyKey === actionKey
                          ? "Cancelling…"
                          : confirmKey === actionKey
                            ? "Confirm cancel order"
                            : "Cancel order"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {isManager && (
              <>
                <Text style={styles.sectionTitle}>Menu management</Text>
                {menu.map((item) => (
                  <View key={item.id} style={styles.menuRow}>
                    <View style={styles.menuCopy}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.description}>
                        R {(item.priceCents / 100).toFixed(2)}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={`Available: ${item.name}`}
                      value={item.isActive}
                      onValueChange={(isActive) =>
                        setMenu((current) =>
                          current.map((entry) =>
                            entry.id === item.id ? { ...entry, isActive } : entry,
                          ),
                        )
                      }
                      trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
                      thumbColor={colors.surface}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === `menu-${item.id}`}
                      onPress={() => void saveMenuItem(item)}
                      style={styles.saveButton}
                    >
                      <Text style={styles.actionText}>
                        {busyKey === `menu-${item.id}` ? "Saving…" : "Save"}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 },
    scrollContent: { paddingBottom: 32 },
    content: {
      alignSelf: "center",
      maxWidth: 760,
      paddingHorizontal: 16,
      paddingBottom: 24,
      width: "100%",
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 10,
      marginTop: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 10,
      padding: 15,
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
    empty: { color: colors.muted, fontSize: 14, paddingVertical: 10 },
    message: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 20 },
    error: {
      backgroundColor: colors.errorBackground,
      borderRadius: 10,
      color: colors.error,
      marginTop: 14,
      padding: 12,
    },
    notice: {
      backgroundColor: colors.successBackground,
      borderRadius: 10,
      color: colors.success,
      marginTop: 14,
      padding: 12,
    },
    highlight: {
      backgroundColor: colors.surface,
      borderColor: colors.accent,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 14,
      padding: 15,
    },
    staffId: { color: colors.accent, fontSize: 21, fontWeight: "800", marginTop: 8 },
    label: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 7, marginTop: 12 },
    roleOptions: { flexDirection: "row", gap: 9, marginBottom: 4 },
    roleOption: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: 9,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 42,
    },
    roleOptionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    roleOptionText: { color: colors.text, fontSize: 14, fontWeight: "600" },
    roleOptionTextActive: { color: colors.textOnDark },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: colors.text,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: 12,
    },
    button: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: 10,
      justifyContent: "center",
      marginTop: 15,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    buttonText: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },
    actionButton: {
      alignSelf: "flex-start",
      borderColor: colors.borderError,
      borderRadius: 9,
      borderWidth: 1,
      marginTop: 11,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    actionText: { color: colors.error, fontSize: 13, fontWeight: "700" },
    menuRow: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
      padding: 12,
    },
    menuCopy: { flex: 1 },
    saveButton: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      minHeight: 38,
      justifyContent: "center",
      paddingHorizontal: 10,
    },
  });
}
