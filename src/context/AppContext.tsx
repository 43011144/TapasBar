import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MenuItem } from "../constants/menuData";
import { colors as lightColors } from "../constants/theme";
import { apiRequest } from "../services/apiClient";

export type ThemeMode = "light" | "dark";

export type AppColors = {
  [Key in keyof typeof lightColors]: string;
};

const darkColors: AppColors = {
  ...lightColors,
  accent: "#ff6b6b",
  accentDark: "#e05252",
  background: "#121212",
  border: "#333333",
  borderError: "#6b3030",
  borderSuccess: "#2e6840",
  charcoal: "#090909",
  muted: "#b0b0b0",
  mutedLight: "#929292",
  secondary: "#5a9fc2",
  secondaryLight: "#d7edf7",
  secondaryTint: "#1e3038",
  surfaceMuted: "#2b2b2b",
  surface: "#1f1f1f",
  success: "#70d48a",
  successBackground: "#193321",
  error: "#ff8a8a",
  errorBackground: "#3b1d1d",
  text: "#f5f5f5",
  textOnDark: "#ffffff",
  textSecondary: "#d1d1d1",
  textUnavailable: "#ff9a9a",
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type OrderItem = MenuItem & {
  quantity: number;
};

export type MenuOverride = {
  name: string;
  priceCents: number;
  isActive: boolean;
};

export function supportsBookingNotifications() {
  return Platform.OS !== "web" && !(Platform.OS === "android" && isRunningInExpoGo());
}

function buildMenuOverrideMap(
  rows: (MenuOverride & { id: string })[],
): Record<string, MenuOverride> {
  return Object.fromEntries(
    rows.map(({ id, name, priceCents, isActive }) => [
      id,
      { name, priceCents: Number(priceCents), isActive: Boolean(isActive) },
    ]),
  );
}

type AppContextValue = {
  colors: AppColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  bookingNotificationsEnabled: boolean;
  setBookingNotificationsEnabled: (enabled: boolean) => void;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markNotificationsRead: () => void;
  orderItems: OrderItem[];
  orderItemCount: number;
  orderTotal: number;
  addToOrder: (item: MenuItem) => void;
  decreaseOrderQuantity: (itemId: string) => void;
  removeFromOrder: (itemId: string) => void;
  clearOrder: () => void;
  menuOverrides: Record<string, MenuOverride>;
  menuError: string | null;
  refreshMenuOverrides: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [bookingNotificationsEnabled, setBookingNotificationsEnabled] = useState(
    supportsBookingNotifications,
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menuOverrides, setMenuOverrides] = useState<Record<string, MenuOverride>>({});
  const [menuError, setMenuError] = useState<string | null>(null);

  const refreshMenuOverrides = useCallback(async () => {
    try {
      const response = await apiRequest<{
        overrides: (MenuOverride & { id: string })[];
      }>("/api/menu/overrides");
      const overrides = buildMenuOverrideMap(response.overrides);
      setMenuOverrides(overrides);
      setOrderItems((current) =>
        current.map((item) => {
          const override = overrides[item.id];
          return override
            ? { ...item, name: override.name, price: override.priceCents / 100 }
            : item;
        }),
      );
      setMenuError(null);
    } catch (error) {
      setMenuError(
        error instanceof Error
          ? error.message
          : "Could not load menu updates from the Tapas API.",
      );
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void apiRequest<{ overrides: (MenuOverride & { id: string })[] }>(
      "/api/menu/overrides",
    )
      .then((response) => {
        if (!isCurrent) return;
        const overrides = buildMenuOverrideMap(response.overrides);
        setMenuOverrides(overrides);
        setOrderItems((current) =>
          current.map((item) => {
            const override = overrides[item.id];
            return override
              ? { ...item, name: override.name, price: override.priceCents / 100 }
              : item;
          }),
        );
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setMenuError(
          error instanceof Error
            ? error.message
            : "Could not load menu updates from the Tapas API.",
        );
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const addNotification = (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    const createdAt = new Date().toISOString();
    setNotifications((current) => [
      {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        createdAt,
        read: false,
      },
      ...current,
    ]);
  };

  const addToOrder = (item: MenuItem) => {
    setOrderItems((current) => {
      const existingItem = current.find((orderItem) => orderItem.id === item.id);
      if (existingItem) {
        return current.map((orderItem) =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem,
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const decreaseOrderQuantity = (itemId: string) => {
    setOrderItems((current) =>
      current.flatMap((item) =>
        item.id === itemId
          ? item.quantity > 1
            ? [{ ...item, quantity: item.quantity - 1 }]
            : []
          : [item],
      ),
    );
  };

  const removeFromOrder = (itemId: string) => {
    setOrderItems((current) => current.filter((item) => item.id !== itemId));
  };

  const contextValue = useMemo<AppContextValue>(
    () => ({
      colors: themeMode === "dark" ? darkColors : lightColors,
      themeMode,
      setThemeMode,
      bookingNotificationsEnabled,
      setBookingNotificationsEnabled,
      notifications,
      unreadNotificationCount: notifications.filter((notification) => !notification.read).length,
      addNotification,
      markNotificationsRead: () =>
        setNotifications((current) =>
          current.map((notification) => ({ ...notification, read: true })),
        ),
      orderItems,
      orderItemCount: orderItems.reduce((count, item) => count + item.quantity, 0),
      orderTotal: orderItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
      addToOrder,
      decreaseOrderQuantity,
      removeFromOrder,
      clearOrder: () => setOrderItems([]),
      menuOverrides,
      menuError,
      refreshMenuOverrides,
    }),
    [
      bookingNotificationsEnabled,
      menuError,
      menuOverrides,
      notifications,
      orderItems,
      refreshMenuOverrides,
      themeMode,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider.");
  }
  return context;
}

export async function requestBookingNotificationPermission() {
  if (!supportsBookingNotifications()) {
    return false;
  }
  const Notifications = await import("expo-notifications");
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function presentBookingNotification(title: string, body: string) {
  if (!supportsBookingNotifications()) {
    return;
  }
  const Notifications = await import("expo-notifications");
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
