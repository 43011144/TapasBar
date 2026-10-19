import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useApp } from "../../context/AppContext";

export default function TabLayout() {
  const { colors, orderItemCount, unreadNotificationCount } = useApp();
  const { width } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: width >= 320,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          height: 76,
          paddingVertical: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          lineHeight: 14,
          marginTop: 2,
        },
        tabBarItemStyle: {
          alignItems: "center",
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.12)",
          flex: 1,
          justifyContent: "center",
          marginHorizontal: 3,
          marginVertical: 3,
          minHeight: 64,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: orderItemCount > 0 ? `Order (${orderItemCount})` : "Order",
          tabBarIcon: ({ color }) => (
            <Ionicons name="bag-handle-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: unreadNotificationCount > 0 ? `Profile (${unreadNotificationCount})` : "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}
