import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import { useAuth } from "../../context/AuthContext";
import {
  requestBookingNotificationPermission,
  supportsBookingNotifications,
  useApp,
} from "../../context/AppContext";
import { layout } from "../../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    colors,
    themeMode,
    setThemeMode,
    bookingNotificationsEnabled,
    setBookingNotificationsEnabled,
    notifications,
    unreadNotificationCount,
    markNotificationsRead,
  } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const notificationsUnavailable = !supportsBookingNotifications();

  const toggleBookingNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestBookingNotificationPermission();
      if (!granted) {
        return;
      }
    }
    setBookingNotificationsEnabled(enabled);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader title="Your profile" subtitle="Preferences & booking updates" />
      <View style={styles.pageContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.textOnDark} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>
              {user ? user.email : "Tapas guest"}
            </Text>
            <Text style={styles.email}>
              {user
                ? user.role === "manager"
                  ? "Manager account"
                  : user.role === "staff"
                    ? "Staff account"
                    : "Customer account"
                : "Manage your visit preferences"}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>

        {user && (
          <>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Signed in as</Text>
              <Text style={styles.cardDescription}>{user.email}</Text>
              {(user.role === "staff" || user.role === "manager") && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/admin")}
                  style={styles.dashboardButton}
                >
                  <Text style={styles.dashboardButtonText}>Open staff dashboard</Text>
                </Pressable>
              )}
              {accountError !== "" && (
                <Text accessibilityRole="alert" style={styles.accountError}>
                  {accountError}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSigningOut }}
                disabled={isSigningOut}
                onPress={async () => {
                  setIsSigningOut(true);
                  setAccountError("");
                  try {
                    await signOut();
                    router.replace("/");
                  } catch (error) {
                    setAccountError(
                      error instanceof Error
                        ? error.message
                        : "Could not sign out. Please try again.",
                    );
                  } finally {
                    setIsSigningOut(false);
                  }
                }}
                style={styles.signOutButton}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={colors.error}
                />
                <Text style={styles.signOutText}>
                  {isSigningOut ? "Signing out…" : "Log out"}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App theme</Text>
          <Text style={styles.cardDescription}>Choose how Tapas looks on your device.</Text>
          <View style={styles.themeOptions}>
            {(["light", "dark"] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: themeMode === mode }}
                onPress={() => setThemeMode(mode)}
                style={[styles.themeOption, themeMode === mode && styles.themeOptionActive]}
              >
                <Ionicons
                  name={mode === "light" ? "sunny-outline" : "moon-outline"}
                  size={19}
                  color={themeMode === mode ? colors.textOnDark : colors.text}
                />
                <Text style={[styles.themeText, themeMode === mode && styles.themeTextActive]}>
                  {mode === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.cardTitle}>Booking notifications</Text>
              <Text style={styles.cardDescription}>
                {Platform.OS === "web"
                  ? "System notifications are available in the iOS and Android apps. Booking updates still appear in your inbox below."
                  : notificationsUnavailable
                    ? "System notifications are not available in Expo Go on Android. Booking updates still appear in your inbox below."
                  : "Get a confirmation when your table is booked."}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Booking notifications"
              accessibilityState={{ disabled: notificationsUnavailable }}
              disabled={notificationsUnavailable}
              value={notificationsUnavailable ? false : bookingNotificationsEnabled}
              onValueChange={toggleBookingNotifications}
              trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={styles.notificationHeader}>
          <Text style={styles.sectionTitle}>Notification inbox</Text>
          {unreadNotificationCount > 0 && (
            <Pressable onPress={markNotificationsRead}>
              <Text style={styles.markRead}>Mark read</Text>
            </Pressable>
          )}
        </View>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={25} color={colors.mutedLight} />
            <Text style={styles.emptyText}>Booking updates and order notifications will appear here.</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View key={notification.id} style={[styles.notification, !notification.read && styles.notificationUnread]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
              <View style={styles.notificationCopy}>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                <Text style={styles.cardDescription}>{notification.message}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: layout.pageBottomPadding },
    pageContent: { width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", paddingHorizontal: layout.horizontalPadding },
    profileCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 13, marginTop: 20, padding: 16 },
    avatar: { alignItems: "center", backgroundColor: colors.secondary, borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
    profileCopy: { flex: 1 },
    name: { color: colors.text, fontSize: 18, fontWeight: "800" },
    email: { color: colors.muted, fontSize: 13, marginTop: 4 },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 11, marginTop: 26 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, padding: 16 },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    cardDescription: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    themeOptions: { flexDirection: "row", gap: 9, marginTop: 14 },
    themeOption: { alignItems: "center", borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 11 },
    themeOptionActive: { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
    themeText: { color: colors.text, fontSize: 14, fontWeight: "700" },
    themeTextActive: { color: colors.textOnDark },
    settingRow: { alignItems: "center", flexDirection: "row", gap: 11 },
    settingIcon: { alignItems: "center", backgroundColor: colors.errorBackground, borderRadius: 10, height: 40, justifyContent: "center", width: 40 },
    settingCopy: { flex: 1 },
    notificationHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    notificationHeaderTitle: { flex: 1 },
    markRead: { color: colors.accent, fontSize: 13, fontWeight: "700" },
    emptyState: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, gap: 8, padding: 24 },
    emptyText: { color: colors.muted, fontSize: 13, textAlign: "center" },
    notification: { alignItems: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 11, marginBottom: 9, padding: 14 },
    notificationUnread: { borderColor: colors.accent },
    notificationCopy: { flex: 1 },
    accountError: { color: colors.error, fontSize: 13, marginTop: 10 },
    dashboardButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: 10,
      justifyContent: "center",
      marginTop: 14,
      minHeight: 44,
      paddingHorizontal: 14,
    },
    dashboardButtonText: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },
    signOutButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: colors.borderError,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
      minHeight: 44,
      paddingHorizontal: 14,
    },
    signOutText: { color: colors.error, fontSize: 14, fontWeight: "700" },
  });
}
